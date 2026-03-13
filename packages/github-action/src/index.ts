import { appendFile, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

interface ActionInputs {
  command: string;
  args: string[];
  policy?: string;
  baseline?: string;
  ignoreFile?: string;
  riskBudget?: string;
  failOn: string;
  workingDirectory: string;
}

interface ReportFinding {
  ruleId: string;
  check: string;
  severity: string;
  message: string;
}

interface ReportPayload {
  report: {
    command: string;
    findings: ReportFinding[];
  };
  summary?: {
    totalFindings: number;
    bySeverity?: Record<string, number>;
  };
  severity?: Record<string, number>;
}

function getRequiredInput(name: string): string {
  const envName = `INPUT_${name.replace(/ /g, "_").replace(/-/g, "_").toUpperCase()}`;
  const value = process.env[envName]?.trim();
  if (!value) {
    throw new Error(`Missing required input: ${name}`);
  }

  return value;
}

function getInput(name: string, fallback = ""): string {
  const envName = `INPUT_${name.replace(/ /g, "_").replace(/-/g, "_").toUpperCase()}`;
  return process.env[envName]?.trim() ?? fallback;
}

export function parseArgsInput(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
      throw new Error("args must be a JSON array of strings");
    }

    return parsed;
  }

  return trimmed
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function buildCliArgs(inputs: ActionInputs, reportPath: string): string[] {
  const cliArgs = ["--format", "json", "--output", reportPath, "--quiet", "--fail-on", inputs.failOn];

  if (inputs.policy) {
    cliArgs.push("--policy", inputs.policy);
  }

  if (inputs.baseline) {
    cliArgs.push("--baseline", inputs.baseline);
  }

  if (inputs.ignoreFile) {
    cliArgs.push("--ignore-file", inputs.ignoreFile);
  }

  if (inputs.riskBudget) {
    cliArgs.push("--risk-budget", inputs.riskBudget);
  }

  cliArgs.push(...inputs.command.split(/\s+/).filter(Boolean));
  cliArgs.push(...inputs.args);

  return cliArgs;
}

function severityLines(payload: ReportPayload): string[] {
  const counts = payload.severity ?? payload.summary?.bySeverity ?? {};
  const ordered = ["critical", "high", "medium", "low", "info"];

  return ordered.map((severity) => `- ${severity}: ${counts[severity] ?? 0}`);
}

export function renderSummary(payload: ReportPayload, exitCode: number, reportPath: string, sarifPath: string): string {
  const findings = payload.report.findings;
  const lines = [
    "# mcp-guard PR Summary",
    "",
    `- Command: ${payload.report.command}`,
    `- Exit code: ${exitCode}`,
    `- Findings: ${findings.length}`,
    `- JSON report: ${reportPath}`,
    `- SARIF report: ${sarifPath}`,
    "",
    "## Severity",
    ...severityLines(payload),
    "",
    "## Top Findings"
  ];

  if (findings.length === 0) {
    lines.push("- No findings.");
    return lines.join("\n");
  }

  lines.push(
    ...findings
      .slice(0, 10)
      .map((finding) => `- [${finding.severity}] ${finding.ruleId} (${finding.check}): ${finding.message}`)
  );

  if (findings.length > 10) {
    lines.push(`- ...and ${findings.length - 10} more findings`);
  }

  return lines.join("\n");
}

async function appendEnvFile(envVarName: "GITHUB_OUTPUT" | "GITHUB_STEP_SUMMARY", content: string): Promise<void> {
  const target = process.env[envVarName];
  if (!target) {
    return;
  }

  await appendFile(target, `${content}\n`, "utf8");
}

async function setOutput(name: string, value: string): Promise<void> {
  await appendEnvFile("GITHUB_OUTPUT", `${name}=${value}`);
}

async function runNodeCommand(cwd: string, cliPath: string, cliArgs: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...cliArgs], {
      cwd,
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function loadPayload(reportPath: string): Promise<ReportPayload | undefined> {
  try {
    const raw = await readFile(reportPath, "utf8");
    return JSON.parse(raw) as ReportPayload;
  } catch {
    return undefined;
  }
}

async function runCliFormat(cwd: string, cliPath: string, cliArgs: string[], outputPath: string, format: "json" | "sarif"): Promise<number> {
  const args = cliArgs.map((value, index, source) => {
    if (source[index - 1] === "--format") {
      return format;
    }

    if (source[index - 1] === "--output") {
      return outputPath;
    }

    return value;
  });

  return runNodeCommand(cwd, cliPath, args);
}

function resolveCliPath(): string {
  const runtimeDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(runtimeDir, "../../../apps/cli/dist/index.js");
}

function readInputs(): ActionInputs {
  return {
    command: getRequiredInput("command"),
    args: parseArgsInput(getInput("args")),
    policy: getInput("policy") || undefined,
    baseline: getInput("baseline") || undefined,
    ignoreFile: getInput("ignore-file") || undefined,
    riskBudget: getInput("risk-budget") || undefined,
    failOn: getInput("fail-on", "warning"),
    workingDirectory: path.resolve(process.cwd(), getInput("working-directory", "."))
  };
}

export async function runAction(): Promise<void> {
  const inputs = readInputs();
  const reportDir = await mkdtemp(path.join(os.tmpdir(), "mcp-guard-action-"));
  const reportPath = path.join(reportDir, "report.json");
  const sarifPath = path.join(reportDir, "report.sarif");
  const markdownPath = path.join(reportDir, "summary.md");
  const cliPath = resolveCliPath();
  const cliArgs = buildCliArgs(inputs, reportPath);
  const exitCode = await runNodeCommand(inputs.workingDirectory, cliPath, cliArgs);
  await runCliFormat(inputs.workingDirectory, cliPath, cliArgs, sarifPath, "sarif");
  const payload = await loadPayload(reportPath);

  await setOutput("exit-code", String(exitCode));
  await setOutput("report-path", reportPath);
  await setOutput("json-report-path", reportPath);
  await setOutput("sarif-report-path", sarifPath);
  await setOutput("markdown-summary-path", markdownPath);
  await setOutput("finding-count", String(payload?.report.findings.length ?? 0));

  if (payload) {
    const summary = renderSummary(payload, exitCode, reportPath, sarifPath);
    await writeFile(markdownPath, `${summary}\n`, "utf8");
    await appendEnvFile("GITHUB_STEP_SUMMARY", summary);
  }

  if (exitCode !== 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void runAction();
}
