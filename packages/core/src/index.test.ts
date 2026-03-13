import { describe, expect, it } from "vitest";
import {
  aggregateBySeverity,
  coreName,
  createRuleId,
  summarizeReport,
  type CheckResult,
  ExitCode,
  exitCodeForReport,
  hasHigherSeverity,
  Severity
} from "./index.js";

describe("core package scaffold", () => {
  it("exports core package name", () => {
    expect(coreName).toBe("mcp-guard core");
  });
});

describe("core model primitives", () => {
  it("creates deterministic rule ids", () => {
    expect(createRuleId("registry.endpoint-reachable")).toBe("registry.endpoint-reachable");
  });

  it("compares severity ordering", () => {
    expect(hasHigherSeverity(Severity.High, Severity.Low)).toBe(true);
    expect(hasHigherSeverity(Severity.Low, Severity.High)).toBe(false);
  });

  it("aggregates findings by severity", () => {
    const findings = [
      {
        check: "registry",
        ruleId: createRuleId("r1"),
        status: "warn",
        message: "missing origin",
        severity: Severity.Low
      } as CheckResult,
      {
        check: "auth",
        ruleId: createRuleId("r2"),
        status: "fail",
        message: "invalid token",
        severity: Severity.High
      } as CheckResult
    ];

    expect(aggregateBySeverity(findings)).toEqual({
      info: 0,
      low: 1,
      medium: 0,
      high: 1,
      critical: 0
    });

    expect(summarizeReport({ findings })).toEqual({
      totalFindings: 2,
      bySeverity: {
        info: 0,
        low: 1,
        medium: 0,
        high: 1,
        critical: 0
      }
    });
  });

  it("derives exit codes", () => {
    const okReport = {
      findings: [
        {
          check: "auth",
          ruleId: createRuleId("r1"),
          status: "warn",
          message: "low risk",
          severity: Severity.Low
        }
      ] as CheckResult[]
    };

    const errorReport = {
      findings: [
        {
          check: "auth",
          ruleId: createRuleId("r2"),
          status: "fail",
          message: "high risk",
          severity: Severity.High
        }
      ] as CheckResult[]
    };

    expect(exitCodeForReport(okReport, { warningThreshold: 1 })).toBe(ExitCode.Success);
    expect(exitCodeForReport(okReport, { warningThreshold: 0 })).toBe(ExitCode.WarningThresholdExceeded);
    expect(exitCodeForReport(errorReport)).toBe(ExitCode.Failure);
  });

  it("classifies low severity findings by threshold", () => {
    const report = {
      findings: [
        {
          check: "auth",
          ruleId: createRuleId("r1"),
          status: "warn",
          message: "low risk",
          severity: Severity.Low
        }
      ] as CheckResult[]
    };

    expect(exitCodeForReport(report, { warningThreshold: 1 })).toBe(ExitCode.Success);
  });
});
