import path from "node:path";
import { describe, expect, it } from "vitest";

import { Severity, createRuleId, type Policy } from "@mcp-guard/core";
import { installCommandRiskRuleId, installParseConfigRuleId, runInstallScan } from "./install.js";

const fixturesRoot = path.resolve(process.cwd(), "../../testdata/install");
const defaultPolicy: Policy = {
  version: "1.0.0",
  name: "test",
  rules: {
    [createRuleId("install.command-risk")]: {
      enabled: true,
      severity: Severity.High
    },
    [createRuleId("install.parse-config")]: {
      enabled: true,
      severity: Severity.High
    }
  },
  metadata: {
    defaultSeverity: Severity.Medium
  }
};

describe("install scan", () => {
  it("accepts a safe config", async () => {
    const report = await runInstallScan(path.join(fixturesRoot, "safe.json"), defaultPolicy);

    expect(report.findings).toHaveLength(0);
    expect(report.metadata?.command).toBe("npx");
  });

  it("accepts a safe yaml config", async () => {
    const report = await runInstallScan(path.join(fixturesRoot, "safe.yaml"), defaultPolicy);

    expect(report.findings).toHaveLength(0);
    expect(report.metadata?.parser).toBe("yaml");
    expect(report.metadata?.command).toBe("uvx");
  });

  it("flags risky patterns from the config", async () => {
    const report = await runInstallScan(path.join(fixturesRoot, "risky.json"), defaultPolicy);
    const ruleIds = report.findings.map((finding) => finding.ruleId);

    expect(ruleIds).toContain(installCommandRiskRuleId);
    expect(report.findings.some((finding) => finding.message.includes("sudo"))).toBe(true);
    expect(report.findings.some((finding) => finding.message.includes("network fetch"))).toBe(true);
  });

  it("supports package.json embedded install config and redacts env", async () => {
    const report = await runInstallScan(path.join(fixturesRoot, "package-risky.json"), defaultPolicy);
    const metadata = report.metadata as {
      parser?: string;
      env?: Record<string, string>;
      redactedEnvKeys?: string[];
    };

    expect(report.findings.some((finding) => finding.ruleId === installCommandRiskRuleId)).toBe(true);
    expect(metadata.parser).toBe("json");
    expect(metadata.env?.MCP_TOKEN).toBe("[REDACTED]");
    expect(metadata.redactedEnvKeys).toContain("MCP_TOKEN");
  });

  it("returns a parse finding for broken config", async () => {
    const report = await runInstallScan(path.join(fixturesRoot, "broken.json"), defaultPolicy);

    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.ruleId).toBe(installParseConfigRuleId);
  });
});
