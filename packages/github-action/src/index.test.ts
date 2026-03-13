import { describe, expect, it } from "vitest";

import { buildCliArgs, parseArgsInput, renderSummary } from "./index.js";

describe("github action helpers", () => {
  it("parses args from json array", () => {
    expect(parseArgsInput('["registry","lint","http://localhost:3000"]')).toEqual([
      "registry",
      "lint",
      "http://localhost:3000"
    ]);
  });

  it("parses args from whitespace separated input", () => {
    expect(parseArgsInput("old.json\nnew.json")).toEqual(["old.json", "new.json"]);
  });

  it("builds cli args with forced json output", () => {
    const args = buildCliArgs(
      {
        command: "diff",
        args: ["old.json", "new.json"],
        policy: "./policies/base.yaml",
        baseline: "./baseline.json",
        ignoreFile: "./ignore.json",
        riskBudget: "2",
        failOn: "error",
        workingDirectory: "/tmp/repo"
      },
      "/tmp/report.json"
    );

    expect(args).toEqual([
      "--format",
      "json",
      "--output",
      "/tmp/report.json",
      "--quiet",
      "--fail-on",
      "error",
      "--policy",
      "./policies/base.yaml",
      "--baseline",
      "./baseline.json",
      "--ignore-file",
      "./ignore.json",
      "--risk-budget",
      "2",
      "diff",
      "old.json",
      "new.json"
    ]);
  });

  it("renders a markdown summary", () => {
    const summary = renderSummary(
      {
        report: {
          command: "auth check",
          findings: [
            {
              ruleId: "auth.https-required",
              check: "auth",
              severity: "high",
              message: "Auth endpoints must use HTTPS"
            }
          ]
        },
        severity: {
          critical: 0,
          high: 1,
          medium: 0,
          low: 0,
          info: 0
        }
      },
      2,
      "/tmp/report.json",
      "/tmp/report.sarif"
    );

    expect(summary).toContain("# mcp-guard PR Summary");
    expect(summary).toContain("auth.https-required");
    expect(summary).toContain("Exit code: 2");
    expect(summary).toContain("SARIF report: /tmp/report.sarif");
    expect(summary).toContain("- high: 1");
  });
});
