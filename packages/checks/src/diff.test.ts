import path from "node:path";
import { describe, expect, it } from "vitest";

import { Severity, createRuleId, type Policy } from "@mcp-guard/core";
import {
  diffToolDescriptionAmbiguousRuleId,
  diffToolParamsChangedRuleId,
  diffToolsChangedRuleId,
  runDiffCheck
} from "./diff.js";

const fixturesRoot = path.resolve(process.cwd(), "../../testdata/diff");
const defaultPolicy: Policy = {
  version: "1.0.0",
  name: "test",
  rules: {
    [createRuleId("diff.description-changed")]: {
      enabled: true,
      severity: Severity.Low
    },
    [createRuleId("diff.tools-changed")]: {
      enabled: true,
      severity: Severity.High
    },
    [createRuleId("diff.install-changed")]: {
      enabled: true,
      severity: Severity.High
    },
    [createRuleId("diff.auth-changed")]: {
      enabled: true,
      severity: Severity.High
    },
    [createRuleId("diff.tool-params-changed")]: {
      enabled: true,
      severity: Severity.High
    },
    [createRuleId("diff.tool-description-ambiguous")]: {
      enabled: true,
      severity: Severity.Medium
    },
    [createRuleId("diff.parse-input")]: {
      enabled: true,
      severity: Severity.High
    }
  },
  metadata: {
    defaultSeverity: Severity.Medium
  }
};

describe("diff check", () => {
  it("accepts unchanged metadata", async () => {
    const stablePath = path.join(fixturesRoot, "stable.json");
    const report = await runDiffCheck({ oldPath: stablePath, newPath: stablePath }, defaultPolicy);

    expect(report.findings).toHaveLength(0);
  });

  it("flags structural changes", async () => {
    const report = await runDiffCheck(
      {
        oldPath: path.join(fixturesRoot, "old.json"),
        newPath: path.join(fixturesRoot, "new.json")
      },
      defaultPolicy
    );

    expect(report.findings.some((finding) => finding.ruleId === diffToolsChangedRuleId)).toBe(true);
    expect(report.findings.length).toBeGreaterThan(1);
    expect((report.metadata?.diffRisk as { overallRisk?: string } | undefined)?.overallRisk).toBe("high");
  });

  it("flags tool parameter changes and ambiguous descriptions", async () => {
    const report = await runDiffCheck(
      {
        oldPath: path.join(fixturesRoot, "tool-old.json"),
        newPath: path.join(fixturesRoot, "tool-new.json")
      },
      defaultPolicy
    );

    expect(report.findings.some((finding) => finding.ruleId === diffToolParamsChangedRuleId)).toBe(true);
    expect(report.findings.some((finding) => finding.ruleId === diffToolDescriptionAmbiguousRuleId)).toBe(true);
  });

  it("returns a parse finding for broken input", async () => {
    const report = await runDiffCheck(
      {
        oldPath: path.join(fixturesRoot, "old.json"),
        newPath: path.join(fixturesRoot, "broken.json")
      },
      defaultPolicy
    );

    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.ruleId).toBe("diff.parse-input");
  });
});
