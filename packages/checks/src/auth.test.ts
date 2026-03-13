import path from "node:path";
import { describe, expect, it } from "vitest";

import { Severity, createRuleId, type Policy } from "@mcp-guard/core";
import {
  authHttpsRequiredRuleId,
  authInlineTokenRuleId,
  authResourceHttpsRequiredRuleId,
  authTokenPassthroughRuleId,
  runAuthCheck
} from "./auth.js";

const fixturesRoot = path.resolve(process.cwd(), "../../testdata/auth");
const defaultPolicy: Policy = {
  version: "1.0.0",
  name: "test",
  rules: {
    [createRuleId("auth.https-required")]: {
      enabled: true,
      severity: Severity.High
    },
    [createRuleId("auth.audience-missing")]: {
      enabled: true,
      severity: Severity.Medium
    },
    [createRuleId("auth.inline-token")]: {
      enabled: true,
      severity: Severity.High
    },
    [createRuleId("auth.resource-https-required")]: {
      enabled: true,
      severity: Severity.High
    },
    [createRuleId("auth.token-passthrough")]: {
      enabled: true,
      severity: Severity.Medium
    },
    [createRuleId("auth.parse-config")]: {
      enabled: true,
      severity: Severity.High
    }
  },
  metadata: {
    defaultSeverity: Severity.Medium
  }
};

describe("auth check", () => {
  it("accepts a safe auth config", async () => {
    const report = await runAuthCheck(path.join(fixturesRoot, "safe.json"), defaultPolicy);

    expect(report.findings).toHaveLength(0);
  });

  it("flags risky auth config", async () => {
    const report = await runAuthCheck(path.join(fixturesRoot, "risky.json"), defaultPolicy);

    expect(report.findings.some((finding) => finding.ruleId === authHttpsRequiredRuleId)).toBe(true);
    expect(report.findings.some((finding) => finding.ruleId === authInlineTokenRuleId)).toBe(true);
    expect(report.findings.some((finding) => finding.ruleId === authResourceHttpsRequiredRuleId)).toBe(true);
  });

  it("flags token passthrough config", async () => {
    const report = await runAuthCheck(path.join(fixturesRoot, "passthrough.json"), defaultPolicy);
    const passthroughFinding = report.findings.find((finding) => finding.ruleId === authTokenPassthroughRuleId);

    expect(passthroughFinding).toBeDefined();
    expect(passthroughFinding?.details?.classification).toBe("token-handling");
  });

  it("returns a parse finding for broken config", async () => {
    const report = await runAuthCheck(path.join(fixturesRoot, "broken.json"), defaultPolicy);

    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.ruleId).toBe("auth.parse-config");
    expect(report.findings[0]?.details?.classification).toBe("config-parse");
  });
});
