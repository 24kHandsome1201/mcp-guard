import path from "node:path";
import { describe, expect, it } from "vitest";

import { createRuleId } from "@mcp-guard/core";
import { defaultPolicy, mergePolicy, parsePolicyYaml, PolicyError, loadPolicyFromFile } from "./index.js";

describe("policy-engine package", () => {
  it("exports engine marker", () => {
    expect(defaultPolicy.name).toBe("base");
  });

  it("parses a valid policy yaml", () => {
    const yaml = [
      "version: \"1.0.0\"",
      "name: custom",
      "description: custom policy",
      "metadata:",
      "  strictMode: true",
      "  defaultSeverity: low",
      "rules:",
      "  registry.endpoint-reachable:",
      "    enabled: true",
      "    severity: low"
    ].join("\n");

    const policy = parsePolicyYaml(yaml);
    expect(policy.name).toBe("custom");
    expect(policy.metadata?.strictMode).toBe(true);
    expect(policy.rules[createRuleId("registry.endpoint-reachable")]).toMatchObject({
      enabled: true,
      severity: "low"
    });
  });

  it("rejects malformed policies", () => {
    const badYaml = "version: 1\nname: bad\nrules: bad\n";
    expect(() => parsePolicyYaml(badYaml)).toThrow(PolicyError);
  });

  it("loads policies from file and merges overrides", async () => {
    const basePath = path.resolve(__dirname, "..", "..", "..", "policies", "base.yaml");
    const customPath = path.resolve(__dirname, "..", "..", "..", "policies", "strict.yaml");
    const base = await loadPolicyFromFile(basePath);
    const customRaw = await loadPolicyFromFile(customPath);
    const merged = mergePolicy(base, customRaw);

    expect(merged.version).toBe("1.0.0");
    expect(merged.metadata?.strictMode).toBe(true);
    expect(merged.rules[createRuleId("install.command-risk")].severity).toBe("critical");
    expect(merged.rules[createRuleId("identity.drift")].severity).toBe("critical");
  });

  it("loads enterprise and ci-friendly packs", async () => {
    const enterprisePath = path.resolve(__dirname, "..", "..", "..", "policies", "enterprise.yaml");
    const ciFriendlyPath = path.resolve(__dirname, "..", "..", "..", "policies", "ci-friendly.yaml");
    const enterprise = await loadPolicyFromFile(enterprisePath);
    const ciFriendly = await loadPolicyFromFile(ciFriendlyPath);

    expect(enterprise.name).toBe("enterprise");
    expect(enterprise.rules[createRuleId("auth.inline-token")].severity).toBe("critical");
    expect(enterprise.rules[createRuleId("diff.tools-changed")].severity).toBe("critical");

    expect(ciFriendly.name).toBe("ci-friendly");
    expect(ciFriendly.rules[createRuleId("install.command-risk")].severity).toBe("medium");
    expect(ciFriendly.rules[createRuleId("auth.audience-missing")].severity).toBe("low");
  });

  it("merges unknown custom rules", () => {
    const overlay = mergePolicy(defaultPolicy, {
      name: "overlay",
      rules: {
        [createRuleId("registry.new-check")]: {
          enabled: false,
          severity: defaultPolicy.metadata?.defaultSeverity
        }
      }
    });

    expect(overlay.name).toBe("overlay");
    expect(overlay.rules[createRuleId("registry.new-check")]).toMatchObject({
      enabled: false,
      severity: defaultPolicy.metadata?.defaultSeverity
    });
  });

  it("ships baseline trust rules", () => {
    expect(defaultPolicy.rules[createRuleId("trust.identity-missing")]).toMatchObject({
      enabled: true,
      severity: "medium"
    });
    expect(defaultPolicy.rules[createRuleId("trust.repository-missing")]).toMatchObject({
      enabled: true,
      severity: "low"
    });
  });
});
