import { describe, expect, it } from "vitest";
import { createRuleId } from "@mcp-guard/core";

import {
  renderJson,
  renderMarkdown,
  renderReport,
  renderSarif,
  renderTerminal,
  type ReporterInput
} from "./index.js";

const report = {
  command: "registry lint",
  startedAt: new Date("2026-03-01T00:00:00.000Z").toISOString(),
  finishedAt: new Date("2026-03-01T00:00:01.500Z").toISOString(),
  metadata: {
    trust: {
      band: "guarded",
      score: 4,
      maxScore: 9,
      presentSignals: 3,
      missingSignals: 3,
      signals: []
    },
    diffRisk: {
      overallRisk: "high",
      changedAreas: ["tools", "auth"],
      byRisk: {
        high: 2,
        medium: 0,
        low: 0
      }
    }
  },
  findings: [
    {
      check: "registry",
      ruleId: createRuleId("registry.endpoint-reachable"),
      status: "fail",
      message: "missing endpoint",
      severity: "high" as const,
      location: {
        file: "registry.json",
        line: 12
      }
    }
  ]
} as ReporterInput["report"];

describe("reporters", () => {
  it("renders terminal output", () => {
    const output = renderTerminal({ report });
    expect(output).toContain("Report: registry lint");
    expect(output).toContain("Trust: guarded (4/9)");
    expect(output).toContain("Diff risk: high (tools, auth)");
    expect(output).toContain("high: 1");
    expect(output).toContain("missing endpoint");
  });

  it("renders stable json", () => {
    const output = renderJson({ report });
    const parsed = JSON.parse(output);

    expect(parsed.report.command).toBe("registry lint");
    expect(parsed.summary.totalFindings).toBe(1);
    expect(parsed.severity.high).toBe(1);
  });

  it("renders markdown", () => {
    const output = renderMarkdown({ report });
    expect(output).toContain("# mcp-guard report");
    expect(output).toContain("- Command: registry lint");
    expect(output).toContain("## Trust");
    expect(output).toContain("- Band: guarded");
    expect(output).toContain("## Diff Risk");
    expect(output).toContain("- Overall risk: high");
    expect(output).toContain("**HIGH** registry: missing endpoint");
  });

  it("renders sarif", () => {
    const output = renderSarif({ report });
    const parsed = JSON.parse(output);

    expect(parsed.version).toBe("2.1.0");
    expect(parsed.runs).toHaveLength(1);
    expect(parsed.runs[0].tool.driver.rules).toHaveLength(1);
    expect(parsed.runs[0].tool.driver.rules[0].id).toBe("registry.endpoint-reachable");
    expect(parsed.runs[0].results).toHaveLength(1);
    expect(parsed.runs[0].results[0].ruleId).toBe("registry.endpoint-reachable");
    expect(parsed.runs[0].results[0].ruleIndex).toBe(0);
    expect(parsed.runs[0].results[0].level).toBe("error");
    expect(parsed.runs[0].results[0].partialFingerprints.primaryLocationLineHash).toContain("registry.endpoint-reachable");
  });

  it("dispatches by format", () => {
    expect(renderReport("terminal", { report })).toContain("Report:");
    expect(renderReport("json", { report })).toContain("\"registry lint\"");
    expect(renderReport("markdown", { report })).toContain("## Severity");
    expect(renderReport("sarif", { report })).toContain("\"version\": \"2.1.0\"");
  });
});
