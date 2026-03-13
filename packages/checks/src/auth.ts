import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRuleId, Severity, type CheckResult, type Policy, type Report, type RuleId } from "@mcp-guard/core";

export const authParseConfigRuleId = createRuleId("auth.parse-config");
export const authHttpsRequiredRuleId = createRuleId("auth.https-required");
export const authAudienceMissingRuleId = createRuleId("auth.audience-missing");
export const authInlineTokenRuleId = createRuleId("auth.inline-token");
export const authResourceHttpsRequiredRuleId = createRuleId("auth.resource-https-required");
export const authTokenPassthroughRuleId = createRuleId("auth.token-passthrough");

export interface AuthCheckInput {
  configPath: string;
}

interface AuthConfig {
  issuer?: string;
  tokenUrl?: string;
  audience?: string;
  resource?: string;
  token?: string;
  accessToken?: string;
  forwardAccessToken?: boolean;
  passthroughHeaders: string[];
  headers?: Record<string, string>;
}

interface AuthSourceShape {
  auth?: unknown;
  issuer?: unknown;
  tokenUrl?: unknown;
  audience?: unknown;
  resource?: unknown;
  token?: unknown;
  accessToken?: unknown;
  forwardAccessToken?: unknown;
  passthroughHeaders?: unknown;
  headers?: unknown;
}

export interface AuthCheckOptions {
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
    check: "auth",
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

function ensureOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }

  return value.trim() || undefined;
}

function readHeaders(value: unknown): Record<string, string> {
  if (value === undefined) {
    return {};
  }

  const headers = asObject(value);
  if (!headers) {
    throw new Error("headers must be an object of string values");
  }

  if (Object.values(headers).some((headerValue) => typeof headerValue !== "string")) {
    throw new Error("headers must be an object of string values");
  }

  return headers as Record<string, string>;
}

function readStringArray(value: unknown, fieldName: string): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${fieldName} must be an array of strings`);
  }

  return value.map((item) => item.trim()).filter(Boolean);
}

function readBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new Error(`${fieldName} must be a boolean`);
  }

  return value;
}

function normalizeAuthConfig(raw: unknown): AuthConfig {
  const root = asObject(raw);
  if (!root) {
    throw new Error("Auth config must be a JSON object");
  }

  const shape = root as AuthSourceShape;
  const nested = asObject(shape.auth) ?? root;
  const nestedShape = nested as AuthSourceShape;

  return {
    issuer: ensureOptionalString(nestedShape.issuer, "issuer"),
    tokenUrl: ensureOptionalString(nestedShape.tokenUrl, "tokenUrl"),
    audience: ensureOptionalString(nestedShape.audience, "audience"),
    resource: ensureOptionalString(nestedShape.resource, "resource"),
    token: ensureOptionalString(nestedShape.token, "token"),
    accessToken: ensureOptionalString(nestedShape.accessToken, "accessToken"),
    forwardAccessToken: readBoolean(nestedShape.forwardAccessToken, "forwardAccessToken"),
    passthroughHeaders: readStringArray(nestedShape.passthroughHeaders, "passthroughHeaders"),
    headers: readHeaders(nestedShape.headers)
  };
}

function usesInsecureHttp(url: string | undefined): boolean {
  return typeof url === "string" && url.startsWith("http://");
}

function looksLikePlaceholder(value: string | undefined): boolean {
  return typeof value === "string" && (/^\$[A-Z0-9_]+$/i.test(value.trim()) || /\$\{[^}]+\}|\{\{[^}]+\}\}/.test(value));
}

function collectAuthFindings(config: AuthConfig, policy: Policy, resolvedPath: string): CheckResult[] {
  const findings: CheckResult[] = [];

  [config.issuer, config.tokenUrl].forEach((url) => {
    if (!usesInsecureHttp(url)) {
      return;
    }

    const finding = createFinding(policy, authHttpsRequiredRuleId, "fail", "Auth endpoints must use HTTPS", {
      configPath: resolvedPath,
      url,
      classification: "protocol-risk",
      field: url === config.issuer ? "issuer" : "tokenUrl"
    });
    if (finding) {
      findings.push(finding);
    }
  });

  if (!config.audience && !config.resource) {
    const finding = createFinding(
      policy,
      authAudienceMissingRuleId,
      "warn",
      "Auth config should define audience or resource",
      {
        configPath: resolvedPath,
        classification: "config-issue",
        missing: ["audience", "resource"]
      }
    );
    if (finding) {
      findings.push(finding);
    }
  }

  if (
    config.token ||
    config.accessToken ||
    Object.keys(config.headers ?? {}).some((key) => key.toLowerCase() === "authorization")
  ) {
    const finding = createFinding(
      policy,
      authInlineTokenRuleId,
      "fail",
      "Auth config should not embed access tokens inline",
      {
        configPath: resolvedPath,
        classification: "token-handling",
        fields: [
          ...(config.token ? ["token"] : []),
          ...(config.accessToken ? ["accessToken"] : []),
          ...Object.keys(config.headers ?? {}).filter((key) => key.toLowerCase() === "authorization")
        ]
      }
    );
    if (finding) {
      findings.push(finding);
    }
  }

  if (usesInsecureHttp(config.resource)) {
    const finding = createFinding(
      policy,
      authResourceHttpsRequiredRuleId,
      "fail",
      "Resource indicator must not use insecure HTTP",
      {
        configPath: resolvedPath,
        classification: "protocol-risk",
        field: "resource",
        resource: config.resource
      }
    );
    if (finding) {
      findings.push(finding);
    }
  }

  const passthroughHeaders = config.passthroughHeaders.filter((header) =>
    ["authorization", "x-api-key", "proxy-authorization"].includes(header.toLowerCase())
  );
  const placeholderHeaders = Object.entries(config.headers ?? {})
    .filter(([header, value]) => header.toLowerCase() === "authorization" && looksLikePlaceholder(value))
    .map(([header]) => header);

  if (config.forwardAccessToken || passthroughHeaders.length > 0 || placeholderHeaders.length > 0) {
    const finding = createFinding(
      policy,
      authTokenPassthroughRuleId,
      "warn",
      "Auth config passes caller token material through to upstream services",
      {
        configPath: resolvedPath,
        classification: "token-handling",
        forwardAccessToken: config.forwardAccessToken ?? false,
        passthroughHeaders,
        placeholderHeaders
      }
    );
    if (finding) {
      findings.push(finding);
    }
  }

  return findings;
}

export async function runAuthCheck(
  input: AuthCheckInput | string,
  policy: Policy,
  options: AuthCheckOptions = {}
): Promise<Report> {
  const startedAt = (options.now ?? (() => new Date().toISOString()))();
  const configPath = typeof input === "string" ? input : input.configPath;
  const resolvedPath = path.resolve(process.cwd(), configPath);

  try {
    const rawText = await readFile(resolvedPath, "utf8");
    const parsed = JSON.parse(rawText) as unknown;
    const config = normalizeAuthConfig(parsed);
    const findings = collectAuthFindings(config, policy, resolvedPath);

    return {
      command: "auth check",
      findings,
      startedAt,
      finishedAt: options.now?.() ?? new Date().toISOString(),
      metadata: {
        configPath: resolvedPath,
        issuer: config.issuer,
        tokenUrl: config.tokenUrl,
        audience: config.audience,
        resource: config.resource,
        forwardAccessToken: config.forwardAccessToken ?? false,
        passthroughHeaders: config.passthroughHeaders
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse auth config";
    const finding = createFinding(policy, authParseConfigRuleId, "fail", message, {
      configPath: resolvedPath,
      classification: "config-parse"
    });

    return {
      command: "auth check",
      findings: finding ? [finding] : [],
      startedAt,
      finishedAt: options.now?.() ?? new Date().toISOString(),
      metadata: {
        configPath: resolvedPath
      }
    };
  }
}
