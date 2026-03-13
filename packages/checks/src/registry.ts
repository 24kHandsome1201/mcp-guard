import { createRuleId, Severity, type CheckResult, type Policy, type Report } from "@mcp-guard/core";

export const registryEndpointReachableRuleId = createRuleId("registry.endpoint-reachable");
export const registryMetadataVersionRuleId = createRuleId("registry.metadata-version");
export const registrySchemaInvalidRuleId = createRuleId("registry.schema-invalid");
export const registryContentTypeRuleId = createRuleId("registry.content-type");
export const registryCorsRuleId = createRuleId("registry.cors-header");

export interface RegistryLintOptions {
  timeoutMs?: number;
  now?: () => string;
}

function resolveRuleSeverity(policy: Policy, ruleId: string, fallback?: Severity): Severity {
  const rule = policy.rules[ruleId as keyof Policy["rules"]] as
    | {
        enabled?: boolean;
        severity?: Severity;
      }
    | undefined;

  return rule?.severity ?? fallback ?? Severity.Medium;
}

function isRuleEnabled(policy: Policy, ruleId: string): boolean {
  const rule = policy.rules[ruleId as keyof Policy["rules"]] as
    | {
        enabled?: boolean;
        severity?: Severity;
      }
    | undefined;

  return rule?.enabled ?? true;
}

function withRuleSeverity<T>(
  enabled: boolean,
  severity: Severity,
  status: CheckResult["status"],
  check: string,
  ruleId: string,
  message: string,
  details?: Record<string, unknown>
): T | undefined {
  if (!enabled) {
    return undefined;
  }

  return {
    check,
    ruleId,
    status,
    message,
    severity,
    details
  } as T;
}

export interface RegistryLintInput {
  endpoint: string;
}

interface RegistryShape {
  version?: unknown;
  name?: unknown;
  endpoints?: unknown;
}

function parseEndpoint(input: string | undefined): URL {
  if (!input) {
    throw new Error("registry.lint requires a registry endpoint URL");
  }

  return new URL(input);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => isNonEmptyString(item));
}

function pushFinding(findings: CheckResult[], finding: CheckResult | undefined): void {
  if (finding) {
    findings.push(finding);
  }
}

function validateSchema(parsed: RegistryShape, policy: Policy, policyDefaultSeverity: Severity): CheckResult[] {
  const findings: CheckResult[] = [];

  pushFinding(
    findings,
    !isNonEmptyString(parsed.name)
      ? withRuleSeverity<CheckResult>(
          isRuleEnabled(policy, registrySchemaInvalidRuleId),
          resolveRuleSeverity(policy, registrySchemaInvalidRuleId, policyDefaultSeverity),
          "fail",
          "registry",
          registrySchemaInvalidRuleId,
          "Registry metadata is missing required field: name",
          {
            classification: "schema",
            path: "name",
            expected: "non-empty string",
            actual: parsed.name === undefined ? "missing" : typeof parsed.name
          }
        )
      : undefined
  );

  pushFinding(
    findings,
    parsed.endpoints !== undefined && !isStringArray(parsed.endpoints)
      ? withRuleSeverity<CheckResult>(
          isRuleEnabled(policy, registrySchemaInvalidRuleId),
          resolveRuleSeverity(policy, registrySchemaInvalidRuleId, policyDefaultSeverity),
          "fail",
          "registry",
          registrySchemaInvalidRuleId,
          "Registry metadata field endpoints must be an array of non-empty strings",
          {
            classification: "schema",
            path: "endpoints",
            expected: "string[]",
            actual: Array.isArray(parsed.endpoints) ? "array-with-invalid-items" : typeof parsed.endpoints
          }
        )
      : undefined
  );

  return findings;
}

export async function runRegistryLint(
  input: RegistryLintInput | string,
  policy: Policy,
  options: RegistryLintOptions = {}
): Promise<Report> {
  const start = (options.now ?? (() => new Date().toISOString()))();
  const endpoint = typeof input === "string" ? input : input.endpoint;
  const command = "registry lint";
  const policyDefaultSeverity = policy.metadata?.defaultSeverity ?? Severity.Medium;
  const findings: CheckResult[] = [];
  const startedAt = start;

  let url: URL;

  try {
    url = parseEndpoint(endpoint);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid registry endpoint";
    const failRuleEnabled = isRuleEnabled(policy, registryEndpointReachableRuleId);
    const finding = withRuleSeverity<CheckResult>(
      failRuleEnabled,
      resolveRuleSeverity(policy, registryEndpointReachableRuleId, policyDefaultSeverity),
      "fail",
      "registry",
      registryEndpointReachableRuleId,
      message,
      {
        classification: "invalid-url",
        endpoint
      }
    );

    pushFinding(findings, finding);

    return {
      command,
      findings,
      startedAt,
      finishedAt: options.now?.() ?? new Date().toISOString(),
      metadata: {
        endpoint,
        source: "input"
      }
    };
  }

  const timeout = options.timeoutMs ?? 1500;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
      headers: {
        accept: "application/json"
      }
    });

    if (!response.ok) {
      const endpointFinding = withRuleSeverity<CheckResult>(
        isRuleEnabled(policy, registryEndpointReachableRuleId),
        resolveRuleSeverity(policy, registryEndpointReachableRuleId, policyDefaultSeverity),
        "fail",
        "registry",
        registryEndpointReachableRuleId,
        `Registry endpoint returned HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`,
        {
          classification: "http-status",
          status: response.status,
          statusText: response.statusText
        }
      );

      pushFinding(findings, endpointFinding);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.toLowerCase().includes("application/json")) {
      pushFinding(
        findings,
        withRuleSeverity<CheckResult>(
          isRuleEnabled(policy, registryContentTypeRuleId),
          resolveRuleSeverity(policy, registryContentTypeRuleId, Severity.Low),
          "warn",
          "registry",
          registryContentTypeRuleId,
          `Registry endpoint returned unexpected content type: ${contentType ?? "<missing>"}`,
          {
            classification: "content-type",
            expected: "application/json",
            actual: contentType ?? "missing"
          }
        )
      );
    }

    const body = await response.text();
    let raw: unknown;

    try {
      raw = JSON.parse(body);
    } catch {
      const versionFinding = withRuleSeverity<CheckResult>(
        isRuleEnabled(policy, registryMetadataVersionRuleId),
        resolveRuleSeverity(policy, registryMetadataVersionRuleId, policyDefaultSeverity),
        "fail",
        "registry",
        registryMetadataVersionRuleId,
        "Registry metadata is not valid JSON",
        {
          classification: "invalid-json",
          contentType: contentType ?? null
        }
      );

      pushFinding(findings, versionFinding);

      const outcome = {
        command,
        findings,
        startedAt,
        finishedAt: options.now?.() ?? new Date().toISOString(),
        metadata: {
          endpoint: url.toString(),
          response: {
            status: response.status,
            contentType: contentType ?? null
          }
        }
      };

      return outcome;
    }

    if (!raw || typeof raw !== "object") {
      const outcome = withRuleSeverity<CheckResult>(
        isRuleEnabled(policy, registryMetadataVersionRuleId),
        resolveRuleSeverity(policy, registryMetadataVersionRuleId, policyDefaultSeverity),
        "fail",
        "registry",
        registryMetadataVersionRuleId,
        "Registry metadata should be a JSON object",
        {
          classification: "schema",
          path: "$",
          expected: "object",
          actual: raw === null ? "null" : typeof raw
        }
      );

      pushFinding(findings, outcome);
    } else {
      const parsed = raw as RegistryShape;
      const version = parsed.version;

      if (typeof version !== "string" || !version.trim()) {
        const versionFinding = withRuleSeverity<CheckResult>(
          isRuleEnabled(policy, registryMetadataVersionRuleId),
          resolveRuleSeverity(policy, registryMetadataVersionRuleId, policyDefaultSeverity),
          "fail",
          "registry",
          registryMetadataVersionRuleId,
          "Registry metadata is missing required field: version",
          {
            classification: "schema",
            path: "version",
            expected: "non-empty string",
            actual: version === undefined ? "missing" : typeof version
          }
        );

        pushFinding(findings, versionFinding);
      }

      findings.push(...validateSchema(parsed, policy, policyDefaultSeverity));
    }

    const corsHeader = response.headers.get("access-control-allow-origin");
    if (!corsHeader) {
      const corsFinding = withRuleSeverity<CheckResult>(
        isRuleEnabled(policy, registryCorsRuleId),
        resolveRuleSeverity(policy, registryCorsRuleId, policyDefaultSeverity),
        "warn",
        "registry",
        registryCorsRuleId,
        "Missing Access-Control-Allow-Origin header",
        {
          classification: "cors",
          header: "access-control-allow-origin"
        }
      );

      pushFinding(findings, corsFinding);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch registry endpoint";
    const classification =
      error instanceof Error && error.name === "AbortError"
        ? "timeout"
        : error instanceof TypeError
          ? "network"
          : "fetch";
    const endpointFinding = withRuleSeverity<CheckResult>(
      isRuleEnabled(policy, registryEndpointReachableRuleId),
      resolveRuleSeverity(policy, registryEndpointReachableRuleId, policyDefaultSeverity),
      "fail",
      "registry",
      registryEndpointReachableRuleId,
      `Cannot reach registry endpoint: ${message}`,
      {
        classification,
        endpoint: url.toString()
      }
    );

    pushFinding(findings, endpointFinding);
  } finally {
    clearTimeout(timer);
  }

  return {
    command,
    findings,
    startedAt,
    finishedAt: options.now?.() ?? new Date().toISOString(),
    metadata: {
      endpoint: url.toString()
    }
  };
}
