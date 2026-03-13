import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { createRuleId, Severity, type CheckResult, type Policy, type Report, type RuleId } from "@mcp-guard/core";

export const installParseConfigRuleId = createRuleId("install.parse-config");
export const installCommandRiskRuleId = createRuleId("install.command-risk");

export interface InstallScanInput {
  configPath: string;
}

export interface InstallProfile {
  command: string;
  args: string[];
  env: Record<string, string>;
}

interface RedactedEnvResult {
  env: Record<string, string>;
  redactedKeys: string[];
}

interface ParsedInstallConfig {
  profile: InstallProfile;
  parser: string;
}

interface InstallConfigShape {
  command?: unknown;
  args?: unknown;
  env?: unknown;
  mcp?: {
    install?: {
      command?: unknown;
      args?: unknown;
      env?: unknown;
    };
  };
  install?: {
    command?: unknown;
    args?: unknown;
    env?: unknown;
  };
}

export interface InstallScanOptions {
  now?: () => string;
}

interface InstallConfigParser {
  id: string;
  supports(filePath: string): boolean;
  parse(content: string): unknown;
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

  const severity = resolveRuleSeverity(policy, ruleId, policy.metadata?.defaultSeverity ?? Severity.Medium);
  return {
    check: "install",
    ruleId,
    status,
    message,
    severity,
    details
  };
}

function ensureStringArray(value: unknown, fieldName: string): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${fieldName} must be an array of strings`);
  }

  return value;
}

function ensureStringRecord(value: unknown, fieldName: string): Record<string, string> {
  if (value === undefined) {
    return {};
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object of string values`);
  }

  const entries = Object.entries(value);
  if (entries.some(([, item]) => typeof item !== "string")) {
    throw new Error(`${fieldName} must be an object of string values`);
  }

  return Object.fromEntries(entries) as Record<string, string>;
}

function normalizeInstallProfile(raw: unknown): InstallProfile {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Install config must be a JSON object");
  }

  const shape = raw as InstallConfigShape;
  const source =
    (shape.install && typeof shape.install === "object" ? shape.install : undefined) ??
    (shape.mcp?.install && typeof shape.mcp.install === "object" ? shape.mcp.install : undefined) ??
    shape;

  if (typeof source.command !== "string" || !source.command.trim()) {
    throw new Error("Install config is missing required field: command");
  }

  return {
    command: source.command,
    args: ensureStringArray(source.args, "args"),
    env: ensureStringRecord(source.env, "env")
  };
}

const installConfigParsers: InstallConfigParser[] = [
  {
    id: "yaml",
    supports(filePath) {
      return /\.ya?ml$/i.test(filePath);
    },
    parse(content) {
      return parseYaml(content);
    }
  },
  {
    id: "json",
    supports(filePath) {
      return /\.json$/i.test(filePath);
    },
    parse(content) {
      return JSON.parse(content) as unknown;
    }
  }
];

function selectParser(filePath: string): InstallConfigParser {
  return installConfigParsers.find((parser) => parser.supports(filePath)) ?? installConfigParsers[1]!;
}

function parseInstallConfig(content: string, filePath: string): ParsedInstallConfig {
  const parser = selectParser(filePath);
  const parsed = parser.parse(content);
  return {
    profile: normalizeInstallProfile(parsed),
    parser: parser.id
  };
}

function isSensitiveEnvKey(key: string): boolean {
  return /(token|secret|password|passwd|api[_-]?key|credential|auth)/i.test(key);
}

function isSensitiveEnvValue(value: string): boolean {
  const trimmed = value.trim();
  return /^(bearer\s+\S+|gh[pousr]_\w+|sk-[A-Za-z0-9_-]+)$/i.test(trimmed) || /^[A-Fa-f0-9]{32,}$/.test(trimmed);
}

function redactEnv(env: Record<string, string>): RedactedEnvResult {
  const redactedKeys: string[] = [];
  const entries = Object.entries(env).map(([key, value]) => {
    if (isSensitiveEnvKey(key) || isSensitiveEnvValue(value)) {
      redactedKeys.push(key);
      return [key, "[REDACTED]"];
    }

    return [key, value];
  });

  return {
    env: Object.fromEntries(entries),
    redactedKeys
  };
}

function collectRisks(profile: InstallProfile): Array<{ message: string; details: Record<string, unknown> }> {
  const commandLine = [profile.command, ...profile.args].join(" ");
  const envValues = Object.values(profile.env);
  const joinedEnv = envValues.join(" ");
  const joinedText = `${commandLine} ${joinedEnv}`.trim();
  const lowered = joinedText.toLowerCase();
  const risks: Array<{ message: string; details: Record<string, unknown> }> = [];

  if (/\bsudo\b/i.test(commandLine)) {
    risks.push({
      message: "Install command should not use sudo",
      details: { riskType: "sudo", command: commandLine }
    });
  }

  if (commandLine.includes("|")) {
    risks.push({
      message: "Install command should not pipe shell output",
      details: { riskType: "pipe", command: commandLine }
    });
  }

  if (
    /\b(curl|wget|powershell)\b/i.test(commandLine) ||
    /https?:\/\//i.test(joinedText)
  ) {
    risks.push({
      message: "Install command performs a direct network fetch",
      details: { riskType: "network", command: commandLine }
    });
  }

  if (/(^|\s)(\/tmp\/|\/var\/tmp\/|\/dev\/shm\/)/i.test(lowered)) {
    risks.push({
      message: "Install command references a risky temporary path",
      details: { riskType: "path", command: commandLine }
    });
  }

  return risks;
}

export async function runInstallScan(
  input: InstallScanInput | string,
  policy: Policy,
  options: InstallScanOptions = {}
): Promise<Report> {
  const startedAt = (options.now ?? (() => new Date().toISOString()))();
  const configPath = typeof input === "string" ? input : input.configPath;
  const findings: CheckResult[] = [];
  const resolvedPath = path.resolve(process.cwd(), configPath);

  try {
    const rawText = await readFile(resolvedPath, "utf8");
    const parsed = parseInstallConfig(rawText, resolvedPath);
    const profile = parsed.profile;
    const risks = collectRisks(profile);
    const redactedEnv = redactEnv(profile.env);

    risks.forEach((risk) => {
      const finding = createFinding(policy, installCommandRiskRuleId, "fail", risk.message, {
        ...risk.details,
        configPath: resolvedPath,
        args: profile.args,
        env: redactedEnv.env,
        envKeys: Object.keys(profile.env),
        redactedEnvKeys: redactedEnv.redactedKeys
      });

      if (finding) {
        findings.push(finding);
      }
    });

    return {
      command: "install scan",
      findings,
      startedAt,
      finishedAt: options.now?.() ?? new Date().toISOString(),
      metadata: {
        configPath: resolvedPath,
        parser: parsed.parser,
        command: profile.command,
        args: profile.args,
        env: redactedEnv.env,
        envKeys: Object.keys(profile.env),
        redactedEnvKeys: redactedEnv.redactedKeys
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse install config";
    const finding = createFinding(policy, installParseConfigRuleId, "fail", message, {
      configPath: resolvedPath
    });

    return {
      command: "install scan",
      findings: finding ? [finding] : [],
      startedAt,
      finishedAt: options.now?.() ?? new Date().toISOString(),
      metadata: {
        configPath: resolvedPath
      }
    };
  }
}
