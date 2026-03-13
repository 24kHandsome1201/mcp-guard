import path from "node:path";
import { describe, expect, it } from "vitest";

import { Severity, createRuleId, type Policy } from "@mcp-guard/core";
import {
  identityConflictRuleId,
  identityDriftRuleId,
  identityMissingFieldRuleId,
  identityStaleRuleId,
  runIdentityCheck
} from "./identity.js";

const fixturesRoot = path.resolve(process.cwd(), "../../testdata/identity");
const defaultPolicy: Policy = {
  version: "1.0.0",
  name: "test",
  rules: {
    [createRuleId("identity.missing-field")]: {
      enabled: true,
      severity: Severity.Low
    },
    [createRuleId("identity.drift")]: {
      enabled: true,
      severity: Severity.High
    },
    [createRuleId("identity.conflict")]: {
      enabled: true,
      severity: Severity.High
    },
    [createRuleId("identity.stale")]: {
      enabled: true,
      severity: Severity.Medium
    },
    [createRuleId("identity.parse-input")]: {
      enabled: true,
      severity: Severity.High
    }
  },
  metadata: {
    defaultSeverity: Severity.Medium
  }
};

describe("identity check", () => {
  it("accepts matching identity across normalized inputs", async () => {
    const report = await runIdentityCheck(
      [path.join(fixturesRoot, "registry.json"), path.join(fixturesRoot, "normalized.json")],
      defaultPolicy
    );

    expect(report.findings).toHaveLength(0);
  });

  it("flags missing identity fields", async () => {
    const report = await runIdentityCheck(
      [path.join(fixturesRoot, "registry.json"), path.join(fixturesRoot, "missing.json")],
      defaultPolicy
    );

    expect(report.findings.some((finding) => finding.ruleId === identityMissingFieldRuleId)).toBe(true);
  });

  it("flags conflicting identity fields", async () => {
    const report = await runIdentityCheck(
      [path.join(fixturesRoot, "registry.json"), path.join(fixturesRoot, "drift.json")],
      defaultPolicy
    );

    expect(report.findings.some((finding) => finding.ruleId === identityDriftRuleId)).toBe(true);
    expect(report.findings.some((finding) => finding.details?.category === "mismatch")).toBe(true);
  });

  it("flags stale lower-precedence versions", async () => {
    const report = await runIdentityCheck(
      [path.join(fixturesRoot, "registry.json"), path.join(fixturesRoot, "stale.json")],
      defaultPolicy
    );

    expect(report.findings.some((finding) => finding.ruleId === identityStaleRuleId)).toBe(true);
  });

  it("flags top-precedence conflicts", async () => {
    const report = await runIdentityCheck(
      [path.join(fixturesRoot, "conflict-a.json"), path.join(fixturesRoot, "conflict-b.json")],
      defaultPolicy
    );

    expect(report.findings.some((finding) => finding.ruleId === identityConflictRuleId)).toBe(true);
  });
});
