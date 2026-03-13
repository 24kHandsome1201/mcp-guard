import { readFile } from "node:fs/promises";
import { parse } from "yaml";

import { createRuleId, Severity, type Policy, type PolicyRuleConfig } from "@mcp-guard/core";

export const policyEngineName = "mcp-guard policy-engine";

export type SeverityString = Severity;

export interface PolicyRulePatch {
  enabled?: boolean;
  severity?: SeverityString;
  reason?: string;
  params?: Record<string, unknown>;
}

export interface PolicyPatch {
  version?: string;
  name?: string;
  description?: string;
  rules?: Record<string, PolicyRulePatch | boolean>;
  metadata?: {
    strictMode?: boolean;
    defaultSeverity?: Severity;
  };
}

export interface PolicyParseOptions {
  allowPartial?: boolean;
}

export class PolicyError extends Error {
  public readonly code: string;
  constructor(message: string, code = "POLICY_INVALID") {
    super(message);
    this.name = "PolicyError";
    this.code = code;
  }
}

const severityValues = Object.values(Severity);

function normalizeSeverity(value: unknown, fallback: Severity): Severity {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== "string") {
    throw new PolicyError("Severity must be a string", "POLICY_INVALID_SEVERITY");
  }
  if (!severityValues.includes(value as Severity)) {
    throw new PolicyError(`Unsupported severity: ${value}`, "POLICY_INVALID_SEVERITY");
  }
  return value as Severity;
}

function normalizeRule(id: string, input: unknown, defaultSeverity: Severity): PolicyRuleConfig {
  if (typeof input === "boolean") {
    return {
      enabled: input,
      severity: defaultSeverity
    };
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new PolicyError(`Rule ${id} must be an object or boolean`, "POLICY_INVALID_RULE");
  }

  const record = input as {
    enabled?: unknown;
    severity?: unknown;
    reason?: unknown;
    params?: unknown;
  };

  if (record.enabled === undefined) {
    throw new PolicyError(`Rule ${id} is missing required field 'enabled'`, "POLICY_MISSING_FIELD");
  }
  if (typeof record.enabled !== "boolean") {
    throw new PolicyError(`Rule ${id}.enabled must be boolean`, "POLICY_INVALID_RULE");
  }

  if (record.reason !== undefined && typeof record.reason !== "string") {
    throw new PolicyError(`Rule ${id}.reason must be string`, "POLICY_INVALID_RULE");
  }

  if (record.params !== undefined && (typeof record.params !== "object" || record.params === null || Array.isArray(record.params))) {
    throw new PolicyError(`Rule ${id}.params must be an object`, "POLICY_INVALID_RULE");
  }

  return {
    enabled: record.enabled,
    severity: normalizeSeverity(record.severity, defaultSeverity),
    reason: record.reason,
    params: record.params as Record<string, unknown> | undefined
  };
}

function asRulePatch(rule: unknown, defaultSeverity: Severity): PolicyRuleConfig {
  if (typeof rule === "boolean") {
    return {
      enabled: rule,
      severity: defaultSeverity
    };
  }
  return normalizeRule("patch", rule, defaultSeverity);
}

function normalizePolicy(input: unknown, options: PolicyParseOptions = {}): PolicyPatch {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new PolicyError("Policy document must be an object", "POLICY_INVALID_DOCUMENT");
  }

  const raw = input as {
    version?: unknown;
    name?: unknown;
    description?: unknown;
    metadata?: unknown;
    rules?: unknown;
  };

  const version = typeof raw.version === "string" ? raw.version : options.allowPartial ? undefined : undefined;
  const name = typeof raw.name === "string" ? raw.name : options.allowPartial ? undefined : undefined;

  if (!options.allowPartial) {
    if (version === undefined) {
      throw new PolicyError("Policy document is missing required field 'version'", "POLICY_MISSING_FIELD");
    }
    if (name === undefined) {
      throw new PolicyError("Policy document is missing required field 'name'", "POLICY_MISSING_FIELD");
    }
  }

  if (raw.description !== undefined && typeof raw.description !== "string") {
    throw new PolicyError("Policy.description must be string", "POLICY_INVALID_DOCUMENT");
  }

  const metadata = parseMetadata(raw.metadata);
  const defaultSeverity = metadata.defaultSeverity ?? Severity.Medium;

  const rulesInput = raw.rules === undefined ? {} : raw.rules;
  if (!rulesInput || typeof rulesInput !== "object" || Array.isArray(rulesInput)) {
    throw new PolicyError("Policy.rules must be an object", "POLICY_INVALID_DOCUMENT");
  }

  const rules = Object.entries(rulesInput as Record<string, unknown>).reduce<Record<string, PolicyRuleConfig>>(
    (acc, [ruleId, ruleValue]) => {
      acc[ruleId] = normalizeRule(ruleId, ruleValue, defaultSeverity);
      return acc;
    },
    {}
  );

  return {
    version,
    name,
    description: raw.description as string | undefined,
    rules,
    metadata
  };
}

function parseMetadata(raw: unknown): { strictMode?: boolean; defaultSeverity?: Severity } {
  if (raw === undefined) {
    return {};
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new PolicyError("Policy.metadata must be an object", "POLICY_INVALID_DOCUMENT");
  }

  const metadata = raw as {
    strictMode?: unknown;
    defaultSeverity?: unknown;
  };

  if (metadata.strictMode !== undefined && typeof metadata.strictMode !== "boolean") {
    throw new PolicyError("Policy.metadata.strictMode must be boolean", "POLICY_INVALID_DOCUMENT");
  }

  const defaultSeverity = metadata.defaultSeverity === undefined ? undefined : normalizeSeverity(metadata.defaultSeverity, Severity.Medium);

  return {
    strictMode: metadata.strictMode,
    defaultSeverity
  };
}

export function parsePolicyYaml(content: string, options: PolicyParseOptions = {}): Policy {
  const parsed = parse(content);
  const patch = normalizePolicy(parsed, options);
  if (patch.version === undefined || patch.name === undefined) {
    throw new PolicyError("Policy document is missing required fields", "POLICY_MISSING_FIELD");
  }

  return {
    version: patch.version,
    name: patch.name,
    description: patch.description,
    rules: Object.entries(patch.rules ?? {}).reduce<Record<string, any>>((acc, [id, rule]) => {
      acc[createRuleId(id)] = rule;
      return acc;
    }, {}),
    metadata: {
      strictMode: patch.metadata?.strictMode,
      defaultSeverity: patch.metadata?.defaultSeverity
    }
  };
}

export async function loadPolicyFromFile(filePath: string): Promise<Policy> {
  const content = await readFile(filePath, "utf8");
  return parsePolicyYaml(content);
}

function mergeRule(base: PolicyRuleConfig | undefined, patch: unknown, defaultSeverity: Severity): PolicyRuleConfig {
  if (patch === undefined) {
    if (!base) {
      throw new PolicyError("Patch for missing rule requires value", "POLICY_MISSING_RULE");
    }
    return base;
  }

  if (typeof patch === "boolean") {
    return { ...base, enabled: patch } as PolicyRuleConfig;
  }

  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw new PolicyError("Invalid rule patch", "POLICY_INVALID_RULE");
  }

  const patchObj = patch as {
    enabled?: unknown;
    severity?: unknown;
    reason?: unknown;
    params?: unknown;
  };

  const next: PolicyRuleConfig = {
    enabled: patchObj.enabled === undefined ? (base?.enabled ?? true) : patchObj.enabled as boolean,
    severity: normalizeSeverity(
      patchObj.severity,
      base?.severity ?? defaultSeverity
    ),
    reason: patchObj.reason === undefined ? base?.reason : (patchObj.reason as string),
    params: patchObj.params === undefined ? base?.params : (patchObj.params as Record<string, unknown>)
  };

  if (patchObj.params !== undefined && (typeof next.params !== "object" || next.params === null || Array.isArray(next.params))) {
    throw new PolicyError("Rule patch params must be object", "POLICY_INVALID_RULE");
  }

  if (patchObj.enabled !== undefined && typeof next.enabled !== "boolean") {
    throw new PolicyError("Rule patch enabled must be boolean", "POLICY_INVALID_RULE");
  }

  if (patchObj.reason !== undefined && typeof patchObj.reason !== "string") {
    throw new PolicyError("Rule patch reason must be string", "POLICY_INVALID_RULE");
  }

  if (base && patchObj.params && typeof patchObj.params === "object" && patchObj.params && !Array.isArray(patchObj.params)) {
    next.params = {
      ...(base.params ?? {}),
      ...(patchObj.params as Record<string, unknown>)
    };
  }

  return next;
}

export function mergePolicy(base: Policy, customPatch: PolicyPatch): Policy {
  const mergedDefaultSeverity = customPatch.metadata?.defaultSeverity ?? base.metadata?.defaultSeverity ?? Severity.Medium;
  const baseRules = base.rules ?? {};

  const mergedRules = Object.entries(baseRules).reduce<Record<string, PolicyRuleConfig>>((acc, [ruleId, baseRule]) => {
    const patchValue = customPatch.rules?.[ruleId] as PolicyRulePatch | boolean | undefined;
    acc[ruleId] = mergeRule(baseRule, patchValue, mergedDefaultSeverity);
    return acc;
  }, {});

  Object.entries(customPatch.rules ?? {}).forEach(([id, rulePatch]) => {
    if (mergedRules[id]) {
      return;
    }
    mergedRules[id] = asRulePatch(rulePatch, mergedDefaultSeverity);
  });

  const mergedPolicy: Policy = {
    version: customPatch.version ?? base.version,
    name: customPatch.name ?? base.name,
    description: customPatch.description ?? base.description,
    rules: Object.fromEntries(
      Object.entries(mergedRules).map(([id, rule]) => [createRuleId(id), rule])
    ),
    metadata: {
      strictMode: customPatch.metadata?.strictMode ?? base.metadata?.strictMode,
      defaultSeverity: mergedDefaultSeverity
    }
  };

  return mergedPolicy;
}

export const defaultPolicy: Policy = {
  version: "1.0.0",
  name: "base",
  description: "Default baseline policy",
  rules: {
    [createRuleId("registry.endpoint-reachable")]: {
      enabled: true,
      severity: Severity.Medium,
      reason: "Baseline endpoint check"
    },
    [createRuleId("registry.metadata-version")]: {
      enabled: true,
      severity: Severity.Medium,
      reason: "Registry metadata should declare a version."
    },
    [createRuleId("registry.schema-invalid")]: {
      enabled: true,
      severity: Severity.Medium,
      reason: "Registry metadata should satisfy the expected response shape."
    },
    [createRuleId("registry.content-type")]: {
      enabled: true,
      severity: Severity.Low,
      reason: "Registry endpoint should return application/json content."
    },
    [createRuleId("registry.cors-header")]: {
      enabled: true,
      severity: Severity.Low,
      reason: "Registry metadata should include a permissive CORS header when expected."
    },
    [createRuleId("install.command-risk")]: {
      enabled: true,
      severity: Severity.High,
      reason: "Detects risky install patterns"
    },
    [createRuleId("identity.parse-input")]: {
      enabled: true,
      severity: Severity.High,
      reason: "Identity inputs should parse into comparable JSON objects."
    },
    [createRuleId("identity.missing-field")]: {
      enabled: true,
      severity: Severity.Low,
      reason: "Identity sources should include the tracked fields."
    },
    [createRuleId("identity.drift")]: {
      enabled: true,
      severity: Severity.High,
      reason: "Lower-precedence identity sources should not drift from the chosen baseline."
    },
    [createRuleId("identity.conflict")]: {
      enabled: true,
      severity: Severity.High,
      reason: "Top-precedence identity sources should not conflict."
    },
    [createRuleId("identity.stale")]: {
      enabled: true,
      severity: Severity.Medium,
      reason: "Lower-precedence versions should not look stale."
    },
    [createRuleId("auth.https-required")]: {
      enabled: true,
      severity: Severity.High,
      reason: "Enforce HTTPS auth endpoints"
    },
    [createRuleId("auth.audience-missing")]: {
      enabled: true,
      severity: Severity.Medium,
      reason: "Auth configs should declare audience or resource."
    },
    [createRuleId("auth.inline-token")]: {
      enabled: true,
      severity: Severity.High,
      reason: "Auth configs should not embed tokens inline."
    },
    [createRuleId("auth.resource-https-required")]: {
      enabled: true,
      severity: Severity.High,
      reason: "Resource indicators should not use insecure HTTP."
    },
    [createRuleId("auth.token-passthrough")]: {
      enabled: true,
      severity: Severity.Medium,
      reason: "Auth configs should avoid caller token passthrough by default."
    },
    [createRuleId("auth.parse-config")]: {
      enabled: true,
      severity: Severity.High,
      reason: "Auth configs should parse into the expected shape."
    },
    [createRuleId("diff.parse-input")]: {
      enabled: true,
      severity: Severity.High,
      reason: "Diff inputs should parse into comparable JSON objects."
    },
    [createRuleId("diff.description-changed")]: {
      enabled: true,
      severity: Severity.Low,
      reason: "Description-only drift is usually lower-risk but still reviewable."
    },
    [createRuleId("diff.tools-changed")]: {
      enabled: true,
      severity: Severity.High,
      reason: "Tool surface changes can materially alter model behavior."
    },
    [createRuleId("diff.tool-params-changed")]: {
      enabled: true,
      severity: Severity.High,
      reason: "Tool parameter surface changes can alter invocation behavior."
    },
    [createRuleId("diff.install-changed")]: {
      enabled: true,
      severity: Severity.High,
      reason: "Install config changes should be reviewed closely."
    },
    [createRuleId("diff.auth-changed")]: {
      enabled: true,
      severity: Severity.High,
      reason: "Auth config changes can materially alter access patterns."
    },
    [createRuleId("diff.tool-description-ambiguous")]: {
      enabled: true,
      severity: Severity.Medium,
      reason: "Ambiguous tool descriptions make behavior harder to review."
    },
    [createRuleId("trust.identity-missing")]: {
      enabled: true,
      severity: Severity.Medium,
      reason: "Metadata should declare a stable identity."
    },
    [createRuleId("trust.version-missing")]: {
      enabled: true,
      severity: Severity.Low,
      reason: "Metadata should declare a version."
    },
    [createRuleId("trust.endpoint-https-missing")]: {
      enabled: true,
      severity: Severity.Medium,
      reason: "Metadata should declare at least one HTTPS endpoint."
    },
    [createRuleId("trust.repository-missing")]: {
      enabled: true,
      severity: Severity.Low,
      reason: "Metadata should link to a repository."
    },
    [createRuleId("trust.homepage-missing")]: {
      enabled: true,
      severity: Severity.Low,
      reason: "Metadata should link to a homepage."
    },
    [createRuleId("trust.auth-issuer-missing")]: {
      enabled: true,
      severity: Severity.Low,
      reason: "Auth metadata should declare an issuer."
    }
  },
  metadata: {
    strictMode: false,
    defaultSeverity: Severity.Medium
  }
};
