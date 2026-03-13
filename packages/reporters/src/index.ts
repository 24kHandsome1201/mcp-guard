import {
  aggregateBySeverity,
  summarizeReport,
  type CheckResult,
  type DiffRiskSummary,
  type Report,
  Severity,
  type TrustAssessment
} from "@mcp-guard/core";

export type ReporterFormat = "terminal" | "json" | "markdown" | "sarif";

export interface ReporterInput {
  report: Report;
}

export interface RenderedReport {
  format: ReporterFormat;
  output: string;
}

export interface ReporterContext {
  appName?: string;
}

export interface SarifArtifact {
  location?: {
    uri: string;
    region?: {
      startLine?: number;
      startColumn?: number;
      snippet?: {
        text: string;
      };
    };
  };
}

interface SarifRuleDescriptor {
  id: string;
  name: string;
  shortDescription: {
    text: string;
  };
  properties: {
    tags: string[];
    precision: "very-high";
  };
}

const defaultApp = "mcp-guard";

function asTrustAssessment(value: unknown): TrustAssessment | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Partial<TrustAssessment>;
  if (
    typeof record.band !== "string" ||
    typeof record.score !== "number" ||
    typeof record.maxScore !== "number" ||
    typeof record.presentSignals !== "number" ||
    typeof record.missingSignals !== "number" ||
    !Array.isArray(record.signals)
  ) {
    return undefined;
  }

  return record as TrustAssessment;
}

function getTrustAssessment(report: Report): TrustAssessment | undefined {
  return asTrustAssessment(report.metadata?.trust);
}

function asDiffRiskSummary(value: unknown): DiffRiskSummary | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Partial<DiffRiskSummary>;
  if (
    typeof record.overallRisk !== "string" ||
    !Array.isArray(record.changedAreas) ||
    !record.byRisk ||
    typeof record.byRisk !== "object"
  ) {
    return undefined;
  }

  return record as DiffRiskSummary;
}

function getDiffRiskSummary(report: Report): DiffRiskSummary | undefined {
  return asDiffRiskSummary(report.metadata?.diffRisk);
}

function formatSeverityCountRows(report: Report): string {
  const summary = summarizeReport(report);
  const ordered = ["critical", "high", "medium", "low", "info"] as const;

  return ordered
    .map((key) => `${key}: ${summary.bySeverity[key]}`)
    .join("\n");
}

function formatFindingList(report: Report): string[] {
  if (report.findings.length === 0) {
    return ["No findings."];
  }

  return report.findings.map((finding) => {
    const location = finding.location
      ? `${finding.location.file ?? "<unknown>"}${finding.location.line ? `:${finding.location.line}` : ""}`
      : "";

    const suffix = location ? ` (${location})` : "";
    return `- [${finding.severity}] ${finding.check}: ${finding.message}${suffix}`;
  });
}

export function renderTerminal({ report }: ReporterInput): string {
  const summary = summarizeReport(report);
  const trust = getTrustAssessment(report);
  const diffRisk = getDiffRiskSummary(report);
  const lines = [
    `Report: ${report.command}`,
    `Total findings: ${summary.totalFindings}`,
    `Started: ${report.startedAt}`,
    `Finished: ${report.finishedAt}`,
    ...(trust ? [`Trust: ${trust.band} (${trust.score}/${trust.maxScore})`] : []),
    ...(diffRisk ? [`Diff risk: ${diffRisk.overallRisk} (${diffRisk.changedAreas.join(", ") || "none"})`] : []),
    "",
    "By severity:",
    formatSeverityCountRows(report),
    "",
    "Findings:",
    ...formatFindingList(report)
  ];

  return lines.join("\n");
}

export function renderJson({ report }: ReporterInput): string {
  const payload = {
    report,
    summary: summarizeReport(report),
    generatedAt: new Date().toISOString(),
    severity: aggregateBySeverity(report.findings)
  };

  return JSON.stringify(payload, null, 2);
}

export function renderMarkdown({ report }: ReporterInput): string {
  const summary = summarizeReport(report);
  const trust = getTrustAssessment(report);
  const diffRisk = getDiffRiskSummary(report);
  const lines = [
    "# mcp-guard report",
    "",
    `- Command: ${report.command}`,
    `- Total findings: ${summary.totalFindings}`,
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    "",
    "## Severity",
    ...Object.entries(summary.bySeverity).map(([severity, count]) => `- ${severity}: ${count}`),
    "",
    ...(trust
      ? [
          "## Trust",
          `- Band: ${trust.band}`,
          `- Score: ${trust.score}/${trust.maxScore}`,
          `- Present signals: ${trust.presentSignals}`,
          `- Missing signals: ${trust.missingSignals}`,
          "",
          ...(diffRisk
            ? [
                "## Diff Risk",
                `- Overall risk: ${diffRisk.overallRisk}`,
                `- Changed areas: ${diffRisk.changedAreas.join(", ") || "none"}`,
                `- High: ${diffRisk.byRisk.high}`,
                `- Medium: ${diffRisk.byRisk.medium}`,
                `- Low: ${diffRisk.byRisk.low}`,
                "",
                "## Findings"
              ]
            : ["## Findings"])
        ]
      : diffRisk
        ? [
            "## Diff Risk",
            `- Overall risk: ${diffRisk.overallRisk}`,
            `- Changed areas: ${diffRisk.changedAreas.join(", ") || "none"}`,
            `- High: ${diffRisk.byRisk.high}`,
            `- Medium: ${diffRisk.byRisk.medium}`,
            `- Low: ${diffRisk.byRisk.low}`,
            "",
            "## Findings"
          ]
        : ["## Findings"])
  ];

  if (report.findings.length === 0) {
    lines.push("- No findings.");
    return lines.join("\n");
  }

  lines.push(
    ...report.findings.map((finding) => {
      const details = Object.entries(finding.details ?? {})
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(", ");
      const location = finding.location
        ? `${finding.location.file ?? "<unknown>"}${finding.location.line ? `:${finding.location.line}` : ""}`
        : "";

      return `- **${finding.severity.toUpperCase()}** ${finding.check}: ${finding.message}${location ? ` (${location})` : ""}${
        details ? ` (${details})` : ""
      }`;
    })
  );

  return lines.join("\n");
}

function sarifLevelForSeverity(severity: Severity): "note" | "warning" | "error" {
  switch (severity) {
    case Severity.Critical:
    case Severity.High:
    case Severity.Medium:
      return "error";
    case Severity.Low:
      return "warning";
    case Severity.Info:
    default:
      return "note";
  }
}

function sarifFingerprintForFinding(finding: CheckResult): string {
  const location = finding.location
    ? `${finding.location.file ?? ""}:${finding.location.line ?? ""}:${finding.location.column ?? ""}`
    : "";

  return [finding.ruleId, finding.check, finding.message, location].join("|");
}

function buildSarifRules(report: Report): SarifRuleDescriptor[] {
  const seen = new Set<string>();

  return report.findings.reduce<SarifRuleDescriptor[]>((rules, finding) => {
    if (seen.has(finding.ruleId)) {
      return rules;
    }

    seen.add(finding.ruleId);
    rules.push({
      id: finding.ruleId,
      name: finding.ruleId,
      shortDescription: {
        text: `${finding.check}: ${finding.message}`
      },
      properties: {
        tags: [finding.check, finding.severity],
        precision: "very-high"
      }
    });

    return rules;
  }, []);
}

export function renderSarif({ report }: ReporterInput, context: ReporterContext = {}): string {
  const rules = buildSarifRules(report);
  const ruleIndexes = new Map(rules.map((rule, index) => [rule.id, index]));
  const runs = [
    {
      tool: {
        driver: {
          name: context.appName ?? defaultApp,
          version: "0.0.0",
          informationUri: "https://github.com/example/mcp-guard",
          rules
        }
      },
      results: report.findings.map((finding) => {
        const locationArtifact: SarifArtifact | undefined = finding.location
          ? {
              location: {
                uri: finding.location.file ?? "unknown",
                region: {
                  startLine: finding.location.line,
                  startColumn: finding.location.column,
                  snippet: finding.location.snippet ? { text: finding.location.snippet } : undefined
                }
              }
            }
          : undefined;

        return {
          ruleId: finding.ruleId,
          ruleIndex: ruleIndexes.get(finding.ruleId),
          message: {
            text: finding.message
          },
          level: sarifLevelForSeverity(finding.severity),
          partialFingerprints: {
            primaryLocationLineHash: sarifFingerprintForFinding(finding)
          },
          properties: {
            check: finding.check,
            severity: finding.severity,
            status: finding.status
          },
          locations: locationArtifact
            ? [
                {
                  physicalLocation: locationArtifact
                }
              ]
            : []
        };
      })
    }
  ];

  const sarif = {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs
  };

  return JSON.stringify(sarif, null, 2);
}

export function renderReport(format: ReporterFormat, input: ReporterInput, context?: ReporterContext): string {
  switch (format) {
    case "terminal":
      return renderTerminal(input);
    case "json":
      return renderJson(input);
    case "markdown":
      return renderMarkdown(input);
    case "sarif":
      return renderSarif(input, context);
    default:
      return renderTerminal(input);
  }
}

export const reportersName = "mcp-guard reporters";
