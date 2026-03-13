import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  createRuleId,
  Severity,
  type CheckResult,
  type DiffRiskLevel,
  type DiffRiskSummary,
  type Policy,
  type Report,
  type RuleId
} from "@mcp-guard/core";

export const diffParseInputRuleId = createRuleId("diff.parse-input");
export const diffDescriptionChangedRuleId = createRuleId("diff.description-changed");
export const diffToolsChangedRuleId = createRuleId("diff.tools-changed");
export const diffInstallChangedRuleId = createRuleId("diff.install-changed");
export const diffAuthChangedRuleId = createRuleId("diff.auth-changed");
export const diffToolParamsChangedRuleId = createRuleId("diff.tool-params-changed");
export const diffToolDescriptionAmbiguousRuleId = createRuleId("diff.tool-description-ambiguous");

export interface DiffCheckInput {
  oldPath: string;
  newPath: string;
}

interface DiffTarget {
  description?: string;
  tools: ToolShape[];
  install?: Record<string, unknown>;
  auth?: Record<string, unknown>;
}

interface ToolShape {
  name?: string;
  description?: string;
  inputSchema?: unknown;
}

export interface DiffCheckOptions {
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
    check: "diff",
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

function asTool(value: unknown): ToolShape {
  const tool = asObject(value);
  if (!tool) {
    return {};
  }

  return {
    name: readString(tool.name),
    description: readString(tool.description),
    inputSchema: tool.inputSchema
  };
}

function normalizeTarget(raw: unknown): DiffTarget {
  const root = asObject(raw);
  if (!root) {
    throw new Error("Diff input must be a JSON object");
  }

  return {
    description: readString(root.description),
    tools: Array.isArray(root.tools) ? root.tools.map((tool) => asTool(tool)) : [],
    install: asObject(root.install),
    auth: asObject(root.auth)
  };
}

async function loadTarget(filePath: string): Promise<DiffTarget> {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  const rawText = await readFile(resolvedPath, "utf8");
  const parsed = JSON.parse(rawText) as unknown;
  return normalizeTarget(parsed);
}

function stableJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function withRisk(
  level: DiffRiskLevel,
  area: string,
  details: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    riskLevel: level,
    changedArea: area,
    ...details
  };
}

function describeToolParamsChanged(oldTarget: DiffTarget, newTarget: DiffTarget): Array<Record<string, unknown>> {
  const oldTools = new Map(oldTarget.tools.filter((tool) => tool.name).map((tool) => [tool.name!, tool]));
  const newTools = new Map(newTarget.tools.filter((tool) => tool.name).map((tool) => [tool.name!, tool]));
  const changes: Array<Record<string, unknown>> = [];

  newTools.forEach((tool, name) => {
    const before = oldTools.get(name);
    if (!before) {
      return;
    }

    if (stableJson(before.inputSchema) !== stableJson(tool.inputSchema)) {
      changes.push({
        tool: name,
        before: before.inputSchema ?? null,
        after: tool.inputSchema ?? null
      });
    }
  });

  return changes;
}

function ambiguousDescriptionReason(description: string | undefined): string | undefined {
  if (!description) {
    return "missing-description";
  }

  const trimmed = description.trim();
  if (trimmed.length < 12) {
    return "too-short";
  }

  if (/^(do|handle|process|get|run|execute)(\s+things?)?\.?$/i.test(trimmed)) {
    return "too-vague";
  }

  if (/^(tool|utility|helper)\b/i.test(trimmed)) {
    return "too-generic";
  }

  return undefined;
}

function collectAmbiguityFindings(newTarget: DiffTarget, policy: Policy): CheckResult[] {
  const findings: CheckResult[] = [];
  const descriptionMap = new Map<string, string[]>();

  newTarget.tools.forEach((tool) => {
    if (!tool.name) {
      return;
    }

    const description = tool.description?.trim().toLowerCase();
    if (description) {
      const existing = descriptionMap.get(description) ?? [];
      existing.push(tool.name);
      descriptionMap.set(description, existing);
    }

    const reason = ambiguousDescriptionReason(tool.description);
    if (!reason) {
      return;
    }

    const finding = createFinding(
      policy,
      diffToolDescriptionAmbiguousRuleId,
      "warn",
      `Tool ${tool.name} has an ambiguous description`,
      withRisk("medium", "tools", {
        ambiguityType: reason,
        tool: tool.name,
        description: tool.description ?? null
      })
    );

    if (finding) {
      findings.push(finding);
    }
  });

  descriptionMap.forEach((toolNames, description) => {
    if (toolNames.length < 2) {
      return;
    }

    const finding = createFinding(
      policy,
      diffToolDescriptionAmbiguousRuleId,
      "warn",
      "Multiple tools share the same description",
      withRisk("medium", "tools", {
        ambiguityType: "overlap",
        tools: toolNames,
        description
      })
    );

    if (finding) {
      findings.push(finding);
    }
  });

  return findings;
}

function summarizeDiffRisk(findings: CheckResult[]): DiffRiskSummary {
  const byRisk: Record<DiffRiskLevel, number> = {
    low: 0,
    medium: 0,
    high: 0
  };
  const changedAreas = new Set<string>();

  findings.forEach((finding) => {
    const riskLevel = finding.details?.riskLevel;
    const changedArea = finding.details?.changedArea;
    if (riskLevel === "low" || riskLevel === "medium" || riskLevel === "high") {
      byRisk[riskLevel] += 1;
    }
    if (typeof changedArea === "string") {
      changedAreas.add(changedArea);
    }
  });

  const overallRisk: DiffRiskLevel = byRisk.high > 0 ? "high" : byRisk.medium > 0 ? "medium" : "low";

  return {
    overallRisk,
    changedAreas: [...changedAreas],
    byRisk
  };
}

function collectDiffFindings(oldTarget: DiffTarget, newTarget: DiffTarget, policy: Policy): CheckResult[] {
  const findings: CheckResult[] = [];

  if ((oldTarget.description ?? "") !== (newTarget.description ?? "")) {
    const finding = createFinding(policy, diffDescriptionChangedRuleId, "warn", "Description changed", withRisk("low", "description", {
      before: oldTarget.description,
      after: newTarget.description
    }));
    if (finding) {
      findings.push(finding);
    }
  }

  if (oldTarget.tools.length !== newTarget.tools.length) {
    const finding = createFinding(policy, diffToolsChangedRuleId, "fail", "Tool surface changed", withRisk("high", "tools", {
      beforeCount: oldTarget.tools.length,
      afterCount: newTarget.tools.length
    }));
    if (finding) {
      findings.push(finding);
    }
  }

  describeToolParamsChanged(oldTarget, newTarget).forEach((change) => {
    const finding = createFinding(
      policy,
      diffToolParamsChangedRuleId,
      "fail",
      `Tool parameter surface changed for ${change.tool as string}`,
      withRisk("high", "tool-params", change)
    );
    if (finding) {
      findings.push(finding);
    }
  });

  if (stableJson(oldTarget.install) !== stableJson(newTarget.install)) {
    const finding = createFinding(policy, diffInstallChangedRuleId, "fail", "Install config changed", withRisk("high", "install", {
      before: oldTarget.install,
      after: newTarget.install
    }));
    if (finding) {
      findings.push(finding);
    }
  }

  if (stableJson(oldTarget.auth) !== stableJson(newTarget.auth)) {
    const finding = createFinding(policy, diffAuthChangedRuleId, "fail", "Auth config changed", withRisk("high", "auth", {
      before: oldTarget.auth,
      after: newTarget.auth
    }));
    if (finding) {
      findings.push(finding);
    }
  }

  findings.push(...collectAmbiguityFindings(newTarget, policy));

  return findings;
}

export async function runDiffCheck(
  input: DiffCheckInput,
  policy: Policy,
  options: DiffCheckOptions = {}
): Promise<Report> {
  const startedAt = (options.now ?? (() => new Date().toISOString()))();
  const oldPath = path.resolve(process.cwd(), input.oldPath);
  const newPath = path.resolve(process.cwd(), input.newPath);

  try {
    const [oldTarget, newTarget] = await Promise.all([loadTarget(input.oldPath), loadTarget(input.newPath)]);
    const findings = collectDiffFindings(oldTarget, newTarget, policy);

    return {
      command: "diff",
      findings,
      startedAt,
      finishedAt: options.now?.() ?? new Date().toISOString(),
      metadata: {
        oldPath,
        newPath,
        diffRisk: summarizeDiffRisk(findings)
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse diff inputs";
    const finding = createFinding(policy, diffParseInputRuleId, "fail", message, {
      oldPath,
      newPath
    });

    return {
      command: "diff",
      findings: finding ? [finding] : [],
      startedAt,
      finishedAt: options.now?.() ?? new Date().toISOString(),
      metadata: {
        oldPath,
        newPath
      }
    };
  }
}
