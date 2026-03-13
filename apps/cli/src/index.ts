import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exitCodeForReport, type CheckResult, type Report, ExitCode } from "@mcp-guard/core";
import { defaultPolicy, loadPolicyFromFile } from "@mcp-guard/policy-engine";
import { type Policy } from "@mcp-guard/core";
import { runAuthCheck, runDiffCheck, runIdentityCheck, runInstallScan, runRegistryLint } from "@mcp-guard/checks";
import {
  renderReport,
  type ReporterFormat,
  type ReporterContext
} from "@mcp-guard/reporters";

export const cliName = "mcp-guard";

type CommandId = "registry lint" | "install scan" | "identity check" | "auth check" | "diff";

type FailOnMode = "warning" | "error" | "off";

interface GlobalOptions {
  policyPath?: string;
  baselinePath?: string;
  writeBaselinePath?: string;
  ignoreFilePath?: string;
  riskBudget?: number;
  format: ReporterFormat;
  output?: string;
  failOn: FailOnMode;
  quiet: boolean;
}

interface ParsedCommand {
  command: CommandId;
  args: string[];
}

interface ParsedRequest {
  options: GlobalOptions;
  command?: ParsedCommand;
  helpRequested: boolean;
}

export interface CliRunResult {
  exitCode: ExitCode;
  stdout: string;
  stderr: string;
  report?: Report;
}

const REPORTER_CONTEXT: ReporterContext = {
  appName: cliName
};

interface BaselineFile {
  version: number;
  fingerprints: string[];
}

interface IgnoreRule {
  ruleId?: string;
  target?: string;
  path?: string;
}

interface IgnoreFile {
  version: number;
  ignores: IgnoreRule[];
}

interface InlineSuppression {
  ruleId?: string;
  target?: string;
  path?: string;
  reason?: string;
}

interface SuppressionSummary {
  count: number;
  findings: Array<{
    ruleId: string;
    message: string;
    source: string;
  }>;
}

const supportedFormats: ReadonlySet<string> = new Set(["terminal", "json", "markdown", "sarif"]);
const supportedFailModes: ReadonlySet<string> = new Set(["warning", "error", "off"]);

function nowIso(): string {
  return new Date().toISOString();
}

function usageText(): string {
  return [
    "mcp-guard",
    "",
    "Usage:",
    "  mcp-guard [--policy <path>] [--baseline <path>] [--write-baseline <path>] [--ignore-file <path>] [--risk-budget <n>] [--format <terminal|json|markdown|sarif>] [--output <path|->] [--fail-on <warning|error|off>] [--quiet] <command>",
    "",
    "Commands:",
    "  registry lint    Validate registry metadata endpoint and baseline requirements",
    "  install scan     Parse local install profile and detect obvious risky patterns",
    "  identity check   Compare identity metadata across inputs",
    "  auth check       Validate transport and auth configuration risks",
    "  diff             Compare before/after metadata snapshots",
    "",
    "Global options:",
    "  --policy <path>       Optional policy yaml file",
    "  --baseline <path>     Ignore findings already recorded in a baseline file",
    "  --write-baseline <path>  Write current findings to a baseline file",
    "  --ignore-file <path>  Optional ignore rules file, defaults to .mcp-guard-ignore if present",
    "  --risk-budget <n>     Allow up to n relevant findings before failing",
    "  --format <fmt>        terminal | json | markdown | sarif",
    "  --output <path|->      Report destination path, '-' means stdout",
    "  --fail-on <mode>      warning (default), error, off",
    "  --quiet                Suppress console output (still writes --output file)",
    ""
  ].join("\n");
}

function errorText(message: string): string {
  return `${message}\n\n${usageText()}`;
}

class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliError";
  }
}

function parseOptionValue(token: string, argv: string[], indexRef: { value: number }): string {
  const inline = token.indexOf("=");
  if (inline > -1) {
    return token.slice(inline + 1);
  }

  const next = argv[indexRef.value + 1];
  if (!next) {
    throw new CliError(`Missing value for option ${token}`);
  }

  indexRef.value += 1;
  return next;
}

function parseArgs(argv: string[]): ParsedRequest {
  const options: GlobalOptions = {
    format: "terminal",
    failOn: "warning",
    quiet: false
  };

  const positional: string[] = [];
  const iterator = { value: 0 };

  for (; iterator.value < argv.length; iterator.value += 1) {
    const token = argv[iterator.value];

    if (token === "--help" || token === "-h") {
      return {
        options,
        helpRequested: true
      };
    }

    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }

    if (token === "--") {
      positional.push(...argv.slice(iterator.value + 1));
      break;
    }

    const [name] = token.split("=", 1);

    switch (name) {
      case "--policy": {
        options.policyPath = parseOptionValue(token, argv, iterator);
        break;
      }
      case "--ignore-file": {
        options.ignoreFilePath = parseOptionValue(token, argv, iterator);
        break;
      }
      case "--baseline": {
        options.baselinePath = parseOptionValue(token, argv, iterator);
        break;
      }
      case "--write-baseline": {
        options.writeBaselinePath = parseOptionValue(token, argv, iterator);
        break;
      }
      case "--risk-budget": {
        const rawValue = parseOptionValue(token, argv, iterator);
        const parsedValue = Number.parseInt(rawValue, 10);
        if (!Number.isInteger(parsedValue) || parsedValue < 0) {
          throw new CliError(`Invalid risk budget: ${rawValue}`);
        }

        options.riskBudget = parsedValue;
        break;
      }
      case "--format": {
        const value = parseOptionValue(token, argv, iterator).toLowerCase();
        if (!supportedFormats.has(value)) {
          throw new CliError(`Unsupported format: ${value}`);
        }

        options.format = value as ReporterFormat;
        break;
      }
      case "--output": {
        options.output = parseOptionValue(token, argv, iterator);
        break;
      }
      case "--fail-on": {
        const value = parseOptionValue(token, argv, iterator).toLowerCase();
        if (!supportedFailModes.has(value)) {
          throw new CliError(`Unsupported fail-on mode: ${value}`);
        }

        options.failOn = value as FailOnMode;
        break;
      }
      case "--quiet":
        options.quiet = true;
        break;
      default:
        throw new CliError(`Unknown option: ${token}`);
    }
  }

  if (positional.length === 0) {
    return {
      options,
      helpRequested: true
    };
  }

  if (positional.length < 2) {
    switch (positional[0]) {
      case "registry": {
        throw new CliError("registry requires subcommand: lint");
      }
      case "install": {
        throw new CliError("install requires subcommand: scan");
      }
      case "identity": {
        throw new CliError("identity requires subcommand: check");
      }
      case "auth": {
        throw new CliError("auth requires subcommand: check");
      }
      case "diff": {
        break;
      }
      default:
        throw new CliError(`Unknown command: ${positional[0]}`);
    }
  }

  const [command, subcommand, ...rest] = positional;

  if (command === "registry") {
    if (subcommand !== "lint") {
      throw new CliError("registry requires subcommand: lint");
    }

    if (rest.length < 1) {
      throw new CliError("registry lint requires endpoint");
    }

    return {
      options,
      command: {
        command: "registry lint",
        args: rest
      },
      helpRequested: false
    };
  }

  if (command === "install") {
    if (subcommand !== "scan") {
      throw new CliError("install requires subcommand: scan");
    }

    if (rest.length < 1) {
      throw new CliError("install scan requires config path");
    }

    return {
      options,
      command: {
        command: "install scan",
        args: rest
      },
      helpRequested: false
    };
  }

  if (command === "identity") {
    if (subcommand !== "check") {
      throw new CliError("identity requires subcommand: check");
    }

    if (rest.length < 2) {
      throw new CliError("identity check requires at least two input paths");
    }

    return {
      options,
      command: {
        command: "identity check",
        args: rest
      },
      helpRequested: false
    };
  }

  if (command === "auth") {
    if (subcommand !== "check") {
      throw new CliError("auth requires subcommand: check");
    }

    if (rest.length < 1) {
      throw new CliError("auth check requires config path");
    }

    return {
      options,
      command: {
        command: "auth check",
        args: rest
      },
      helpRequested: false
    };
  }

  if (command === "diff") {
    const diffArgs = [subcommand, ...rest].filter(Boolean);
    if (diffArgs.length < 2) {
      throw new CliError("diff requires old and new input paths");
    }

    return {
      options,
      command: {
        command: "diff",
        args: diffArgs
      },
      helpRequested: false
    };
  }

  throw new CliError(`Unknown command: ${command}`);
}

function mapExitCode(exitCode: ExitCode, failOn: FailOnMode): ExitCode {
  if (failOn === "off") {
    return ExitCode.Success;
  }

  if (failOn === "error") {
    return exitCode === ExitCode.Failure ? ExitCode.Failure : ExitCode.Success;
  }

  return exitCode;
}

async function loadPolicy(policyPath?: string): Promise<Policy> {
  if (!policyPath) {
    return defaultPolicy;
  }

  const policyFile = path.resolve(process.cwd(), policyPath);
  return loadPolicyFromFile(policyFile);
}

function defaultIgnoreFilePath(): string {
  return path.resolve(process.cwd(), ".mcp-guard-ignore");
}

function findingFingerprint(finding: CheckResult): string {
  const location = finding.location
    ? `${finding.location.file ?? ""}:${finding.location.line ?? ""}:${finding.location.column ?? ""}`
    : "";

  return [finding.ruleId, finding.check, finding.message, location].join("|");
}

async function loadBaseline(baselinePath?: string): Promise<Set<string> | undefined> {
  if (!baselinePath) {
    return undefined;
  }

  const resolvedPath = path.resolve(process.cwd(), baselinePath);
  const content = await readFile(resolvedPath, "utf8");
  const parsed = JSON.parse(content) as unknown;

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CliError("Baseline file must be a JSON object");
  }

  const record = parsed as Partial<BaselineFile>;
  if (record.version !== 1) {
    throw new CliError("Baseline file version must be 1");
  }

  if (!Array.isArray(record.fingerprints) || record.fingerprints.some((value) => typeof value !== "string")) {
    throw new CliError("Baseline file fingerprints must be an array of strings");
  }

  return new Set(record.fingerprints);
}

async function hasFile(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadIgnoreRules(ignoreFilePath?: string): Promise<IgnoreRule[]> {
  const resolvedPath = ignoreFilePath ? path.resolve(process.cwd(), ignoreFilePath) : defaultIgnoreFilePath();
  if (!(await hasFile(resolvedPath))) {
    return [];
  }

  const content = await readFile(resolvedPath, "utf8");
  const parsed = JSON.parse(content) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CliError("Ignore file must be a JSON object");
  }

  const record = parsed as Partial<IgnoreFile>;
  if (record.version !== 1) {
    throw new CliError("Ignore file version must be 1");
  }

  if (!Array.isArray(record.ignores)) {
    throw new CliError("Ignore file ignores must be an array");
  }

  record.ignores.forEach((rule) => {
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
      throw new CliError("Ignore entries must be objects");
    }
  });

  return record.ignores;
}

function extractFindingPaths(report: Report, finding: CheckResult): string[] {
  const values = new Set<string>();

  if (finding.location?.file) {
    values.add(path.resolve(process.cwd(), finding.location.file));
  }

  Object.values(finding.details ?? {}).forEach((value) => {
    if (typeof value === "string" && (value.includes("/") || value.endsWith(".json"))) {
      values.add(path.resolve(process.cwd(), value));
    }
  });

  if (typeof report.metadata?.configPath === "string") {
    values.add(path.resolve(process.cwd(), report.metadata.configPath));
  }

  if (typeof report.metadata?.endpoint === "string") {
    values.add(report.metadata.endpoint);
  }

  if (typeof report.metadata?.oldPath === "string") {
    values.add(path.resolve(process.cwd(), report.metadata.oldPath));
  }

  if (typeof report.metadata?.newPath === "string") {
    values.add(path.resolve(process.cwd(), report.metadata.newPath));
  }

  const inputs = Array.isArray(report.metadata?.inputs) ? report.metadata.inputs : [];
  inputs.forEach((input) => {
    if (input && typeof input === "object" && "path" in input && typeof input.path === "string") {
      values.add(path.resolve(process.cwd(), input.path));
    }
  });

  return Array.from(values);
}

function matchesSuppressionRule(report: Report, finding: CheckResult, rule: IgnoreRule | InlineSuppression): boolean {
  if (rule.ruleId && rule.ruleId !== finding.ruleId) {
    return false;
  }

  if (rule.target && rule.target !== report.command) {
    return false;
  }

  if (rule.path) {
    const expectedPath = path.resolve(process.cwd(), rule.path);
    const actualPaths = extractFindingPaths(report, finding);
    if (!actualPaths.includes(expectedPath)) {
      return false;
    }
  }

  return true;
}

async function loadInlineSuppressions(args: string[]): Promise<InlineSuppression[]> {
  const suppressions: InlineSuppression[] = [];

  for (const arg of args) {
    const resolvedArg = path.resolve(process.cwd(), arg);
    if (!arg.endsWith(".json") || !(await hasFile(resolvedArg))) {
      continue;
    }

    try {
      const content = await readFile(resolvedArg, "utf8");
      const parsed = JSON.parse(content) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        continue;
      }

      const record = parsed as {
        mcpGuard?: {
          suppressions?: InlineSuppression[];
        };
      };

      if (Array.isArray(record.mcpGuard?.suppressions)) {
        record.mcpGuard.suppressions.forEach((entry) => {
          if (entry && typeof entry === "object" && !Array.isArray(entry)) {
            suppressions.push(entry);
          }
        });
      }
    } catch {
      continue;
    }
  }

  return suppressions;
}

function applySuppressions(
  report: Report,
  ignoreRules: IgnoreRule[],
  inlineSuppressions: InlineSuppression[]
): { report: Report; summary?: SuppressionSummary } {
  const suppressed: SuppressionSummary["findings"] = [];

  const findings = report.findings.filter((finding) => {
    const ignored = ignoreRules.some((rule) => matchesSuppressionRule(report, finding, rule));
    if (ignored) {
      suppressed.push({
        ruleId: finding.ruleId,
        message: finding.message,
        source: "ignore-file"
      });
      return false;
    }

    const inlineSuppressed = inlineSuppressions.some((rule) => matchesSuppressionRule(report, finding, rule));
    if (inlineSuppressed) {
      suppressed.push({
        ruleId: finding.ruleId,
        message: finding.message,
        source: "inline-suppression"
      });
      return false;
    }

    return true;
  });

  if (suppressed.length === 0) {
    return { report };
  }

  return {
    report: {
      ...report,
      findings,
      metadata: {
        ...(report.metadata ?? {}),
        suppressedFindings: {
          count: suppressed.length,
          findings: suppressed
        }
      }
    },
    summary: {
      count: suppressed.length,
      findings: suppressed
    }
  };
}

function applyBaseline(report: Report, baselineFingerprints: Set<string> | undefined, baselinePath?: string): Report {
  if (!baselineFingerprints) {
    return report;
  }

  const originalCount = report.findings.length;
  const findings = report.findings.filter((finding) => !baselineFingerprints.has(findingFingerprint(finding)));
  const suppressedCount = originalCount - findings.length;

  return {
    ...report,
    findings,
    metadata: {
      ...(report.metadata ?? {}),
      baseline: {
        path: baselinePath,
        suppressedCount,
        originalFindingCount: originalCount
      }
    }
  };
}

async function writeBaselineFile(outputPath: string | undefined, report: Report): Promise<void> {
  if (!outputPath) {
    return;
  }

  const resolvedPath = path.resolve(process.cwd(), outputPath);
  const baseline: BaselineFile = {
    version: 1,
    fingerprints: report.findings.map((finding) => findingFingerprint(finding))
  };
  await writeFile(resolvedPath, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
}

function relevantFindingCount(report: Report, failOn: FailOnMode): number {
  if (failOn === "off") {
    return 0;
  }

  return report.findings.filter((finding) => {
    if (failOn === "error") {
      return finding.severity === "medium" || finding.severity === "high" || finding.severity === "critical";
    }

    return true;
  }).length;
}

function applyRiskBudget(exitCode: ExitCode, report: Report, failOn: FailOnMode, budget?: number): ExitCode {
  if (budget === undefined || failOn === "off") {
    return exitCode;
  }

  return relevantFindingCount(report, failOn) <= budget ? ExitCode.Success : exitCode;
}

function formatSuppressionSuffix(
  report: Report,
  format: ReporterFormat
): string {
  const suppressed = report.metadata?.suppressedFindings as SuppressionSummary | undefined;
  if (!suppressed || suppressed.count === 0) {
    return "";
  }

  if (format === "terminal" || format === "markdown") {
    return `\n\nSuppressed findings: ${suppressed.count}`;
  }

  return "";
}

async function runCommand(command: CommandId, args: string[], policy: Policy): Promise<Report> {
  if (command === "registry lint") {
    return runRegistryLint({ endpoint: args[0] }, policy);
  }

  if (command === "install scan") {
    return runInstallScan({ configPath: args[0] }, policy);
  }

  if (command === "identity check") {
    return runIdentityCheck({ paths: args }, policy);
  }

  if (command === "auth check") {
    return runAuthCheck({ configPath: args[0] }, policy);
  }

  if (command === "diff") {
    return runDiffCheck({ oldPath: args[0], newPath: args[1] }, policy);
  }

  const commonMetadata = {
    commandArgs: args,
    placeholder: true
  };

  const startedAt = nowIso();

  return {
    command,
    findings: [],
    startedAt,
    finishedAt: nowIso(),
    metadata: {
      ...commonMetadata
    }
  };
}

function applyPolicyMetadata(report: Report, command: CommandId, policyPath: string | undefined, policy: Policy): Report {
  return {
    ...report,
    metadata: {
      ...(report.metadata ?? {}),
      command,
      policy: {
        name: policy.name,
        version: policy.version,
        strictMode: policy.metadata?.strictMode ?? false,
        path: policyPath
      }
    }
  };
}

async function writeIfRequested(output: string | undefined, text: string): Promise<boolean> {
  if (!output) {
    return false;
  }

  if (output === "-") {
    return false;
  }

  const destination = path.resolve(process.cwd(), output);
  await writeFile(destination, text, "utf8");
  return true;
}

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<CliRunResult> {
  let parsed: ParsedRequest;

  try {
    parsed = parseArgs(argv);
  } catch (error) {
    if (error instanceof CliError) {
      return {
        exitCode: ExitCode.InvalidInput,
        stdout: "",
        stderr: errorText(error.message)
      };
    }

    throw error;
  }

  if (parsed.helpRequested) {
    return {
      exitCode: ExitCode.Success,
      stdout: `${usageText()}\n`,
      stderr: ""
    };
  }

  if (!parsed.command) {
    return {
      exitCode: ExitCode.InvalidInput,
      stdout: "",
      stderr: errorText("No command found")
    };
  }

  let selectedPolicy: Policy;
  let baselineFingerprints: Set<string> | undefined;
  let ignoreRules: IgnoreRule[] = [];
  let inlineSuppressions: InlineSuppression[] = [];

  try {
    selectedPolicy = await loadPolicy(parsed.options.policyPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      exitCode: ExitCode.InvalidInput,
      stdout: "",
      stderr: errorText(`Could not load policy: ${message}`)
    };
  }

  try {
    baselineFingerprints = await loadBaseline(parsed.options.baselinePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      exitCode: ExitCode.InvalidInput,
      stdout: "",
      stderr: errorText(`Could not load baseline: ${message}`)
    };
  }

  try {
    ignoreRules = await loadIgnoreRules(parsed.options.ignoreFilePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      exitCode: ExitCode.InvalidInput,
      stdout: "",
      stderr: errorText(`Could not load ignore file: ${message}`)
    };
  }

  inlineSuppressions = await loadInlineSuppressions(parsed.command.args);

  const startedAt = nowIso();

  let report: Report;
  try {
    report = await runCommand(parsed.command.command, parsed.command.args, selectedPolicy);
  } catch (error) {
    if (error instanceof CliError) {
      return {
        exitCode: ExitCode.InvalidInput,
        stdout: "",
        stderr: errorText(error.message)
      };
    }

    throw error;
  }

  report = {
    ...report,
    startedAt,
    finishedAt: nowIso(),
    metadata: {
      ...(report.metadata ?? {}),
      ...applyPolicyMetadata(report, parsed.command.command, parsed.options.policyPath, selectedPolicy).metadata
    }
  };
  report = applyBaseline(report, baselineFingerprints, parsed.options.baselinePath);
  report = applySuppressions(report, ignoreRules, inlineSuppressions).report;
  report = {
    ...report,
    metadata: {
      ...(report.metadata ?? {}),
      riskBudget:
        parsed.options.riskBudget === undefined
          ? undefined
          : {
              budget: parsed.options.riskBudget,
              relevantFindingCount: relevantFindingCount(report, parsed.options.failOn),
              failOn: parsed.options.failOn
            }
    }
  };

  try {
    await writeBaselineFile(parsed.options.writeBaselinePath, report);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      exitCode: ExitCode.InvalidInput,
      stdout: "",
      stderr: errorText(`Could not write baseline: ${message}`)
    };
  }

  const rawReport = `${renderReport(parsed.options.format, { report }, REPORTER_CONTEXT)}${formatSuppressionSuffix(
    report,
    parsed.options.format
  )}`;
  const shouldWriteStdout = !parsed.options.quiet && (!parsed.options.output || parsed.options.output === "-");
  await writeIfRequested(parsed.options.output, rawReport);

  const reportExitCode = exitCodeForReport(report);
  const exitCode = applyRiskBudget(mapExitCode(reportExitCode, parsed.options.failOn), report, parsed.options.failOn, parsed.options.riskBudget);

  return {
    exitCode,
    stdout: shouldWriteStdout ? `${rawReport}\n` : "",
    stderr: "",
    report
  };
}

export async function main(): Promise<void> {
  const result = await runCli();

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  process.exit(result.exitCode);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}
