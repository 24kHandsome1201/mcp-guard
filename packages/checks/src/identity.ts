import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRuleId, Severity, type CheckResult, type Policy, type Report, type RuleId } from "@mcp-guard/core";

export const identityParseInputRuleId = createRuleId("identity.parse-input");
export const identityMissingFieldRuleId = createRuleId("identity.missing-field");
export const identityDriftRuleId = createRuleId("identity.drift");
export const identityConflictRuleId = createRuleId("identity.conflict");
export const identityStaleRuleId = createRuleId("identity.stale");

export interface IdentityCheckInput {
  paths: string[];
}

interface IdentityRecord {
  source: string;
  path: string;
  precedence: number;
  id?: string;
  name?: string;
  version?: string;
  normalizedName?: string;
  normalizedVersion?: string;
}

interface IdentitySourceShape {
  id?: unknown;
  canonicalId?: unknown;
  name?: unknown;
  displayName?: unknown;
  version?: unknown;
  identity?: unknown;
  server?: unknown;
  registry?: unknown;
  manifest?: unknown;
  source?: unknown;
}

export interface IdentityCheckOptions {
  now?: () => string;
}

function resolveRuleSeverity(policy: Policy, ruleId: string, fallback?: Severity): Severity {
  const rule = policy.rules[ruleId as keyof Policy["rules"]] as
    | {
        severity?: Severity;
      }
    | undefined;

  return rule?.severity ?? fallback ?? Severity.Medium;
}

function isRuleEnabled(policy: Policy, ruleId: string): boolean {
  const rule = policy.rules[ruleId as keyof Policy["rules"]] as
    | {
        enabled?: boolean;
      }
    | undefined;

  return rule?.enabled ?? true;
}

function createFinding(
  policy: Policy,
  ruleId: RuleId,
  status: CheckResult["status"],
  message: string,
  details?: Record<string, unknown>
): CheckResult | undefined {
  if (!isRuleEnabled(policy, ruleId)) {
    return undefined;
  }

  return {
    check: "identity",
    ruleId,
    status,
    message,
    severity: resolveRuleSeverity(policy, ruleId, policy.metadata?.defaultSeverity ?? Severity.Medium),
    details
  };
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeId(value: string | undefined): string | undefined {
  return value?.trim().toLowerCase();
}

function normalizeName(value: string | undefined): string | undefined {
  return value?.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeVersion(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.replace(/^v(?=\d)/i, "");
}

function sourcePrecedence(source: string): number {
  const lowered = source.trim().toLowerCase();
  if (lowered === "registry") {
    return 1;
  }
  if (lowered === "manifest") {
    return 2;
  }
  if (lowered === "server-card" || lowered === "server") {
    return 3;
  }
  if (lowered === "local-config" || lowered === "config") {
    return 4;
  }
  return 5;
}

function compareField(record: IdentityRecord, field: "id" | "name" | "version"): string | undefined {
  if (field === "name") {
    return record.normalizedName;
  }
  if (field === "version") {
    return record.normalizedVersion;
  }
  return record.id;
}

function parseComparableVersion(value: string | undefined): number[] | undefined {
  if (!value || !/^\d+(\.\d+)*$/.test(value)) {
    return undefined;
  }

  return value.split(".").map((part) => Number.parseInt(part, 10));
}

function compareVersions(left: string | undefined, right: string | undefined): number | undefined {
  const leftParts = parseComparableVersion(left);
  const rightParts = parseComparableVersion(right);
  if (!leftParts || !rightParts) {
    return undefined;
  }

  const max = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < max; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;
    if (leftValue === rightValue) {
      continue;
    }
    return leftValue < rightValue ? -1 : 1;
  }

  return 0;
}

function extractIdentity(raw: unknown, sourcePath: string): IdentityRecord {
  const root = asObject(raw);
  if (!root) {
    throw new Error("Identity input must be a JSON object");
  }

  const shape = root as IdentitySourceShape;
  const nested =
    asObject(shape.identity) ??
    asObject(shape.server) ??
    asObject(shape.registry) ??
    asObject(shape.manifest) ??
    root;

  const source = readString(shape.source) ?? path.basename(sourcePath);
  const nestedShape = nested as IdentitySourceShape;
  const id = readString(nestedShape.id) ?? readString(nestedShape.canonicalId);
  const name = readString(nestedShape.name) ?? readString(nestedShape.displayName);
  const version = readString(nestedShape.version);

  return {
    source,
    path: sourcePath,
    precedence: sourcePrecedence(source),
    id: normalizeId(id),
    name,
    version,
    normalizedName: normalizeName(name),
    normalizedVersion: normalizeVersion(version)
  };
}

async function loadIdentityRecord(filePath: string): Promise<IdentityRecord> {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  const rawText = await readFile(resolvedPath, "utf8");
  const parsed = JSON.parse(rawText) as unknown;
  return extractIdentity(parsed, resolvedPath);
}

function collectIdentityFindings(records: IdentityRecord[], policy: Policy): CheckResult[] {
  const findings: CheckResult[] = [];

  (["id", "name", "version"] as const).forEach((field) => {
    const candidates = records
      .filter((record) => compareField(record, field))
      .sort((left, right) => left.precedence - right.precedence);

    if (candidates.length === 0) {
      return;
    }

    const topPrecedence = candidates[0]!.precedence;
    const topCandidates = candidates.filter((record) => record.precedence === topPrecedence);
    const topValues = [...new Set(topCandidates.map((record) => compareField(record, field)))];
    const baselineRecord = topCandidates[0]!;
    const baselineValue = compareField(baselineRecord, field)!;

    if (topValues.length > 1) {
      const finding = createFinding(
        policy,
        identityConflictRuleId,
        "fail",
        `Identity field ${field} conflicts between top-precedence sources`,
        {
          category: "conflict",
          field,
          precedence: topPrecedence,
          sources: topCandidates.map((record) => ({
            source: record.source,
            path: record.path,
            value: record[field]
          }))
        }
      );

      if (finding) {
        findings.push(finding);
      }
    }

    records.forEach((record) => {
      const value = compareField(record, field);

      if (!value) {
        const finding = createFinding(
          policy,
          identityMissingFieldRuleId,
          "warn",
          `Identity field ${field} is missing in ${record.source}`,
          {
            category: "missing",
            field,
            source: record.source,
            path: record.path,
            baselineSource: baselineRecord.source
          }
        );
        if (finding) {
          findings.push(finding);
        }
        return;
      }

      if (record.path === baselineRecord.path && record.source === baselineRecord.source) {
        return;
      }

      if (value !== baselineValue) {
        if (
          field === "version" &&
          record.precedence > baselineRecord.precedence &&
          compareVersions(record.normalizedVersion, baselineRecord.normalizedVersion) === -1
        ) {
          const staleFinding = createFinding(
            policy,
            identityStaleRuleId,
            "warn",
            `Identity field version appears stale in ${record.source}`,
            {
              category: "stale",
              field,
              source: record.source,
              path: record.path,
              baselineSource: baselineRecord.source,
              expected: baselineRecord.version,
              actual: record.version
            }
          );
          if (staleFinding) {
            findings.push(staleFinding);
          }
          return;
        }

        const finding = createFinding(
          policy,
          identityDriftRuleId,
          "fail",
          `Identity field ${field} drifts in ${record.source}`,
          {
            category: record.precedence === baselineRecord.precedence ? "conflict" : "mismatch",
            field,
            source: record.source,
            path: record.path,
            sourcePrecedence: record.precedence,
            baselineSource: baselineRecord.source,
            baselinePrecedence: baselineRecord.precedence,
            expected: baselineRecord[field],
            actual: record[field]
          }
        );
        if (finding) {
          findings.push(finding);
        }
      }
    });
  });

  return findings;
}

export async function runIdentityCheck(
  input: IdentityCheckInput | string[],
  policy: Policy,
  options: IdentityCheckOptions = {}
): Promise<Report> {
  const startedAt = (options.now ?? (() => new Date().toISOString()))();
  const paths = Array.isArray(input) ? input : input.paths;

  try {
    const records = await Promise.all(paths.map((filePath) => loadIdentityRecord(filePath)));
    const findings = collectIdentityFindings(records, policy);

    return {
      command: "identity check",
      findings,
      startedAt,
      finishedAt: options.now?.() ?? new Date().toISOString(),
      metadata: {
        inputs: records.map((record) => ({
          source: record.source,
          path: record.path,
          precedence: record.precedence,
          id: record.id,
          name: record.name,
          version: record.version
        }))
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse identity input";
    const finding = createFinding(policy, identityParseInputRuleId, "fail", message, {
      inputs: paths.map((filePath) => path.resolve(process.cwd(), filePath))
    });

    return {
      command: "identity check",
      findings: finding ? [finding] : [],
      startedAt,
      finishedAt: options.now?.() ?? new Date().toISOString(),
      metadata: {
        inputs: paths.map((filePath) => path.resolve(process.cwd(), filePath))
      }
    };
  }
}
