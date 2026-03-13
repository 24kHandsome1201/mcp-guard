import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { ExitCode } from "@mcp-guard/core";
import { runCli } from "./index.js";

const installFixturesRoot = path.resolve(process.cwd(), "../../testdata/install");
const identityFixturesRoot = path.resolve(process.cwd(), "../../testdata/identity");
const authFixturesRoot = path.resolve(process.cwd(), "../../testdata/auth");
const diffFixturesRoot = path.resolve(process.cwd(), "../../testdata/diff");

describe("cli shell", () => {
  const fixtureServers: Array<() => void> = [];

  async function createFixtureServer(responseBody: string, headers: Record<string, string> = {}): Promise<string> {
    const server = createServer((_req, res) => {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      res.end(responseBody);
    });

    return new Promise((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        if (!address || typeof address === "string") {
          throw new Error("Invalid server address");
        }

        fixtureServers.push(() => server.close());
        resolve(`http://127.0.0.1:${address.port}`);
      });
    });
  }

  afterEach(() => {
    fixtureServers.forEach((close) => close());
    fixtureServers.length = 0;
  });

  it("shows help when called without args", async () => {
    const result = await runCli([]);

    expect(result.exitCode).toBe(ExitCode.Success);
    expect(result.stdout).toContain("Usage:");
    expect(result.stdout).toContain("registry lint");
  });

  it("routes registry lint to registry checks", async () => {
    const endpoint = await createFixtureServer('{"version":"1.0.0","name":"mcp"}', {
      "Access-Control-Allow-Origin": "*"
    });
    const result = await runCli(["registry", "lint", endpoint]);

    expect(result.exitCode).toBe(ExitCode.Success);
    expect(result.report?.command).toBe("registry lint");
    expect(result.stdout).toContain("Report: registry lint");
    expect(result.report?.findings).toHaveLength(0);
  });

  it("preserves richer registry diagnostics in json output", async () => {
    const endpoint = await createFixtureServer('{"version":"1.0.0","endpoints":[1]}');
    const result = await runCli(["--format", "json", "registry", "lint", endpoint]);
    const payload = JSON.parse(result.stdout) as {
      report: {
        findings: Array<{
          ruleId: string;
          details?: Record<string, unknown>;
        }>;
      };
    };

    const schemaFinding = payload.report.findings.find((finding) => finding.details?.classification === "schema");

    expect(result.exitCode).toBe(ExitCode.Failure);
    expect(schemaFinding?.ruleId).toBe("registry.schema-invalid");
    expect(schemaFinding?.details?.path).toBe("name");
  });

  it("requires registry endpoint argument", async () => {
    const result = await runCli(["registry", "lint"]);

    expect(result.exitCode).toBe(ExitCode.InvalidInput);
    expect(result.stderr).toContain("registry lint requires endpoint");
  });

  it("renders requested output format", async () => {
    const registryPath = path.join(identityFixturesRoot, "registry.json");
    const manifestPath = path.join(identityFixturesRoot, "manifest.json");
    const result = await runCli(["--format", "json", "identity", "check", registryPath, manifestPath]);

    expect(result.exitCode).toBe(ExitCode.Success);
    const payload = JSON.parse(result.stdout);

    expect(payload.report.command).toBe("identity check");
    expect(payload.generatedAt).toBeDefined();
  });

  it("writes report to file when --output is set", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mcp-guard-cli-"));
    const target = path.join(root, "out.txt");
    const configPath = path.join(installFixturesRoot, "safe.json");
    const result = await runCli(["--output", target, "install", "scan", configPath]);

    const written = await readFile(target, "utf8");

    expect(result.exitCode).toBe(ExitCode.Success);
    expect(result.stdout).toBe("");
    expect(written).toContain("Report: install scan");
  });

  it("writes a baseline file from current findings", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mcp-guard-cli-baseline-"));
    const baselinePath = path.join(root, "baseline.json");
    const configPath = path.join(installFixturesRoot, "risky.json");
    const result = await runCli(["--write-baseline", baselinePath, "install", "scan", configPath]);
    const baseline = JSON.parse(await readFile(baselinePath, "utf8")) as { version: number; fingerprints: string[] };

    expect(result.exitCode).toBe(ExitCode.Failure);
    expect(baseline.version).toBe(1);
    expect(baseline.fingerprints.length).toBeGreaterThan(0);
  });

  it("suppresses known findings from a baseline file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mcp-guard-cli-baseline-"));
    const baselinePath = path.join(root, "baseline.json");
    const configPath = path.join(installFixturesRoot, "risky.json");

    await runCli(["--write-baseline", baselinePath, "install", "scan", configPath]);
    const result = await runCli(["--baseline", baselinePath, "install", "scan", configPath]);
    const baselineMeta = result.report?.metadata?.baseline as { suppressedCount?: number } | undefined;

    expect(result.exitCode).toBe(ExitCode.Success);
    expect(result.report?.findings).toHaveLength(0);
    expect(baselineMeta?.suppressedCount).toBeGreaterThan(0);
  });

  it("suppresses findings via ignore file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mcp-guard-cli-ignore-"));
    const ignorePath = path.join(root, ".mcp-guard-ignore");
    const configPath = path.join(installFixturesRoot, "risky.json");

    await writeFile(
      ignorePath,
      JSON.stringify(
        {
          version: 1,
          ignores: [{ ruleId: "install.command-risk", target: "install scan", path: configPath }]
        },
        null,
        2
      ),
      "utf8"
    );

    const result = await runCli(["--ignore-file", ignorePath, "install", "scan", configPath]);
    const suppressed = result.report?.metadata?.suppressedFindings as { count?: number } | undefined;

    expect(result.exitCode).toBe(ExitCode.Success);
    expect(result.report?.findings).toHaveLength(0);
    expect(suppressed?.count).toBeGreaterThan(0);
  });

  it("suppresses findings via inline metadata", async () => {
    const configPath = path.join(installFixturesRoot, "suppressed-inline.json");
    const result = await runCli(["install", "scan", configPath]);
    const suppressed = result.report?.metadata?.suppressedFindings as { count?: number } | undefined;

    expect(result.exitCode).toBe(ExitCode.Success);
    expect(result.report?.findings).toHaveLength(0);
    expect(suppressed?.count).toBeGreaterThan(0);
  });

  it("applies risk budget after suppression and baseline filtering", async () => {
    const configPath = path.join(installFixturesRoot, "risky.json");
    const result = await runCli(["--risk-budget", "4", "install", "scan", configPath]);
    const riskBudget = result.report?.metadata?.riskBudget as { relevantFindingCount?: number; budget?: number } | undefined;

    expect(result.exitCode).toBe(ExitCode.Success);
    expect(riskBudget?.budget).toBe(4);
    expect(riskBudget?.relevantFindingCount).toBeGreaterThan(0);
  });

  it("routes install scan to install checks", async () => {
    const configPath = path.join(installFixturesRoot, "risky.json");
    const result = await runCli(["install", "scan", configPath]);

    expect(result.report?.command).toBe("install scan");
    expect(result.report?.findings.length).toBeGreaterThan(0);
    expect(result.exitCode).toBe(ExitCode.Failure);
  });

  it("requires install config path", async () => {
    const result = await runCli(["install", "scan"]);

    expect(result.exitCode).toBe(ExitCode.InvalidInput);
    expect(result.stderr).toContain("install scan requires config path");
  });

  it("routes identity check to identity comparison", async () => {
    const registryPath = path.join(identityFixturesRoot, "registry.json");
    const driftPath = path.join(identityFixturesRoot, "drift.json");
    const result = await runCli(["identity", "check", registryPath, driftPath]);

    expect(result.report?.command).toBe("identity check");
    expect(result.report?.findings.length).toBeGreaterThan(0);
    expect(result.exitCode).toBe(ExitCode.Failure);
  });

  it("preserves identity drift categories in json output", async () => {
    const registryPath = path.join(identityFixturesRoot, "registry.json");
    const stalePath = path.join(identityFixturesRoot, "stale.json");
    const result = await runCli(["--format", "json", "identity", "check", registryPath, stalePath]);
    const payload = JSON.parse(result.stdout) as {
      report: {
        findings: Array<{
          ruleId: string;
          details?: Record<string, unknown>;
        }>;
      };
    };

    const staleFinding = payload.report.findings.find((finding) => finding.details?.category === "stale");

    expect(staleFinding?.ruleId).toBe("identity.stale");
  });

  it("requires at least two identity inputs", async () => {
    const registryPath = path.join(identityFixturesRoot, "registry.json");
    const result = await runCli(["identity", "check", registryPath]);

    expect(result.exitCode).toBe(ExitCode.InvalidInput);
    expect(result.stderr).toContain("identity check requires at least two input paths");
  });

  it("routes auth check to auth smoke checks", async () => {
    const configPath = path.join(authFixturesRoot, "risky.json");
    const result = await runCli(["auth", "check", configPath]);

    expect(result.report?.command).toBe("auth check");
    expect(result.report?.findings.length).toBeGreaterThan(0);
    expect(result.exitCode).toBe(ExitCode.Failure);
  });

  it("preserves auth finding classifications in json output", async () => {
    const configPath = path.join(authFixturesRoot, "passthrough.json");
    const result = await runCli(["--format", "json", "auth", "check", configPath]);
    const payload = JSON.parse(result.stdout) as {
      report: {
        findings: Array<{
          ruleId: string;
          details?: Record<string, unknown>;
        }>;
      };
    };

    const passthroughFinding = payload.report.findings.find((finding) => finding.ruleId === "auth.token-passthrough");

    expect(passthroughFinding?.details?.classification).toBe("token-handling");
  });

  it("requires auth config path", async () => {
    const result = await runCli(["auth", "check"]);

    expect(result.exitCode).toBe(ExitCode.InvalidInput);
    expect(result.stderr).toContain("auth check requires config path");
  });

  it("routes diff to structural comparison", async () => {
    const oldPath = path.join(diffFixturesRoot, "old.json");
    const newPath = path.join(diffFixturesRoot, "new.json");
    const result = await runCli(["diff", oldPath, newPath]);

    expect(result.report?.command).toBe("diff");
    expect(result.report?.findings.length).toBeGreaterThan(0);
    expect(result.exitCode).toBe(ExitCode.Failure);
  });

  it("preserves diff risk and ambiguity metadata in json output", async () => {
    const oldPath = path.join(diffFixturesRoot, "tool-old.json");
    const newPath = path.join(diffFixturesRoot, "tool-new.json");
    const result = await runCli(["--format", "json", "diff", oldPath, newPath]);
    const payload = JSON.parse(result.stdout) as {
      report: {
        metadata?: Record<string, unknown>;
        findings: Array<{
          ruleId: string;
          details?: Record<string, unknown>;
        }>;
      };
    };

    const ambiguityFinding = payload.report.findings.find((finding) => finding.ruleId === "diff.tool-description-ambiguous");
    const diffRisk = payload.report.metadata?.diffRisk as { overallRisk?: string } | undefined;

    expect(diffRisk?.overallRisk).toBe("high");
    expect(ambiguityFinding?.details?.riskLevel).toBe("medium");
  });

  it("requires old and new diff paths", async () => {
    const result = await runCli(["diff"]);

    expect(result.exitCode).toBe(ExitCode.InvalidInput);
    expect(result.stderr).toContain("diff requires old and new input paths");
  });

  it("fails early for invalid format", async () => {
    const result = await runCli(["--format", "yaml", "auth", "check"]);

    expect(result.exitCode).toBe(ExitCode.InvalidInput);
    expect(result.stderr).toContain("Unsupported format");
  });

  it("loads a custom policy file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mcp-guard-cli-policy-"));
    const policyPath = path.join(root, "policy.yaml");
    const oldPath = path.join(diffFixturesRoot, "old.json");
    const newPath = path.join(diffFixturesRoot, "new.json");
    const policyDoc = [
      "version: \"1.0.0\"",
      "name: test",
      "rules: {}"
    ].join("\n");

    await writeFile(policyPath, policyDoc, "utf8");

    const result = await runCli(["--policy", policyPath, "diff", oldPath, newPath]);
    const policyMeta = result.report?.metadata?.policy as { name?: string } | undefined;

    expect(result.exitCode).toBe(ExitCode.Failure);
    expect(policyMeta?.name).toBe("test");
    expect(result.report?.command).toBe("diff");
  });
});
