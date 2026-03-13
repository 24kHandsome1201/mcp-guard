import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  Severity,
  type CheckResult,
  type MetadataProviderResult,
  type MetadataSourceKind,
  type MetadataSourceRef,
  type NormalizedMetadata,
  type Policy,
  type PolicyRuleConfig,
  type RuleId,
  type TrustAssessment,
  type TrustBand,
  type TrustSignal
} from "@mcp-guard/core";

export const metadataName = "mcp-guard metadata";

export interface MetadataProvider<TInput> {
  kind: MetadataSourceKind;
  load(input: TInput): Promise<MetadataProviderResult>;
}

export interface ServerCardInput {
  path: string;
  label?: string;
}

interface ServerCardShape {
  serverCard?: unknown;
  id?: unknown;
  name?: unknown;
  version?: unknown;
  description?: unknown;
  homepage?: unknown;
  repository?: unknown;
  endpoints?: unknown;
  auth?: unknown;
  install?: unknown;
}

interface TrustRuleDefinition {
  ruleId: RuleId;
  label: string;
  weight: number;
  severity: Severity;
  message: string;
  present(normalized: NormalizedMetadata): boolean;
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    return undefined;
  }

  return value;
}

function normalizeIdentityId(value: string | undefined): string | undefined {
  return value?.trim().toLowerCase();
}

function asRuleId(value: string): RuleId {
  return value as RuleId;
}

const trustRuleDefinitions: TrustRuleDefinition[] = [
  {
    ruleId: asRuleId("trust.identity-missing"),
    label: "Identity",
    weight: 3,
    severity: Severity.Medium,
    message: "Metadata should declare both a stable identity id and name.",
    present(normalized) {
      return Boolean(normalized.identity.id && normalized.identity.name);
    }
  },
  {
    ruleId: asRuleId("trust.version-missing"),
    label: "Version",
    weight: 1,
    severity: Severity.Low,
    message: "Metadata should declare a version for traceability.",
    present(normalized) {
      return Boolean(normalized.identity.version);
    }
  },
  {
    ruleId: asRuleId("trust.endpoint-https-missing"),
    label: "HTTPS endpoint",
    weight: 2,
    severity: Severity.Medium,
    message: "Metadata should expose at least one HTTPS endpoint.",
    present(normalized) {
      return normalized.endpoints?.some((endpoint) => endpoint.startsWith("https://")) ?? false;
    }
  },
  {
    ruleId: asRuleId("trust.repository-missing"),
    label: "Repository",
    weight: 1,
    severity: Severity.Low,
    message: "Metadata should link to a source repository.",
    present(normalized) {
      return Boolean(normalized.repository);
    }
  },
  {
    ruleId: asRuleId("trust.homepage-missing"),
    label: "Homepage",
    weight: 1,
    severity: Severity.Low,
    message: "Metadata should link to a project homepage or documentation entrypoint.",
    present(normalized) {
      return Boolean(normalized.homepage);
    }
  },
  {
    ruleId: asRuleId("trust.auth-issuer-missing"),
    label: "Auth issuer",
    weight: 1,
    severity: Severity.Low,
    message: "Metadata should declare an auth issuer when auth metadata exists.",
    present(normalized) {
      if (!normalized.auth) {
        return true;
      }

      return Boolean(normalized.auth.issuer);
    }
  }
];

function scoreToBand(score: number): TrustBand {
  if (score >= 8) {
    return "strong";
  }
  if (score >= 5) {
    return "moderate";
  }
  if (score >= 3) {
    return "guarded";
  }
  return "low";
}

function statusForSeverity(severity: Severity): CheckResult["status"] {
  return severity === Severity.Info || severity === Severity.Low ? "warn" : "fail";
}

function resolvePolicyRule(policy: Policy | undefined, definition: TrustRuleDefinition): PolicyRuleConfig {
  return policy?.rules?.[definition.ruleId] ?? {
    enabled: true,
    severity: definition.severity
  };
}

export function assessMetadataTrust(normalized: NormalizedMetadata): TrustAssessment {
  const signals: TrustSignal[] = trustRuleDefinitions.map((definition) => {
    const present = definition.present(normalized);

    return {
      id: definition.ruleId,
      label: definition.label,
      status: present ? "present" : "missing",
      weight: definition.weight,
      message: present ? `${definition.label} signal is present.` : definition.message
    };
  });

  const score = signals.reduce((total, signal) => total + (signal.status === "present" ? signal.weight : 0), 0);
  const maxScore = signals.reduce((total, signal) => total + signal.weight, 0);

  return {
    band: scoreToBand(score),
    score,
    maxScore,
    presentSignals: signals.filter((signal) => signal.status === "present").length,
    missingSignals: signals.filter((signal) => signal.status === "missing").length,
    signals
  };
}

export function createTrustFindings(
  normalized: NormalizedMetadata,
  assessment: TrustAssessment,
  policy?: Policy
): CheckResult[] {
  return trustRuleDefinitions.flatMap((definition) => {
    const signal = assessment.signals.find((entry) => entry.id === definition.ruleId);
    if (!signal || signal.status !== "missing") {
      return [];
    }

    const rule = resolvePolicyRule(policy, definition);
    if (!rule.enabled) {
      return [];
    }

    return [
      {
        check: "metadata trust",
        ruleId: definition.ruleId,
        status: statusForSeverity(rule.severity ?? definition.severity),
        message: definition.message,
        severity: rule.severity ?? definition.severity,
        details: {
          trustBand: assessment.band,
          score: assessment.score,
          maxScore: assessment.maxScore,
          signal: definition.label
        },
        location: normalized.source.path
          ? {
              file: normalized.source.path
            }
          : undefined
      }
    ];
  });
}

export function normalizeMetadataRecord(
  raw: Record<string, unknown>,
  source: MetadataSourceRef
): MetadataProviderResult {
  const root = raw as ServerCardShape;
  const body = asObject(root.serverCard) ?? raw;
  const warnings: string[] = [];

  const id = normalizeIdentityId(asString(body.id));
  const name = asString(body.name);
  const version = asString(body.version);

  if (!id) {
    warnings.push("Missing normalized identity.id");
  }

  if (!name) {
    warnings.push("Missing normalized identity.name");
  }

  const authRaw = asObject(body.auth);
  const installRaw = asObject(body.install);
  const normalized: NormalizedMetadata = {
    source,
    identity: {
      id,
      name,
      version
    },
    description: asString(body.description),
    homepage: asString(body.homepage),
    repository: asString(body.repository),
    endpoints: asStringArray(body.endpoints),
    auth: authRaw
      ? {
          issuer: asString(authRaw.issuer),
          audience: asString(authRaw.audience),
          resource: asString(authRaw.resource)
        }
      : undefined,
    install: installRaw
      ? {
          command: asString(installRaw.command),
          args: asStringArray(installRaw.args)
        }
      : undefined,
    raw
  };

  return {
    source,
    raw,
    normalized,
    warnings
  };
}

export const serverCardProvider: MetadataProvider<ServerCardInput> = {
  kind: "server-card",
  async load(input: ServerCardInput): Promise<MetadataProviderResult> {
    const resolvedPath = path.resolve(process.cwd(), input.path);
    const content = await readFile(resolvedPath, "utf8");
    const parsed = JSON.parse(content) as unknown;
    const raw = asObject(parsed);

    if (!raw) {
      throw new Error("Server Card input must be a JSON object");
    }

    return normalizeMetadataRecord(raw, {
      kind: "server-card",
      label: input.label ?? path.basename(resolvedPath),
      path: resolvedPath
    });
  }
};
