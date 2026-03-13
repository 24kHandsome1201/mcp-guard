import path from "node:path";
import { describe, expect, it } from "vitest";
import { createRuleId, Severity, type Policy } from "@mcp-guard/core";

import { assessMetadataTrust, createTrustFindings, normalizeMetadataRecord, serverCardProvider } from "./index.js";

const fixturesRoot = path.resolve(process.cwd(), "../../testdata/metadata");

describe("metadata package", () => {
  it("normalizes raw metadata records", () => {
    const result = normalizeMetadataRecord(
      {
        id: "Com.Example.Memory",
        name: "Memory Server",
        version: "1.2.3",
        endpoints: ["https://example.com/mcp"]
      },
      {
        kind: "unknown",
        label: "inline"
      }
    );

    expect(result.normalized.identity.id).toBe("com.example.memory");
    expect(result.normalized.identity.name).toBe("Memory Server");
    expect(result.normalized.endpoints).toEqual(["https://example.com/mcp"]);
  });

  it("loads a server card fixture", async () => {
    const result = await serverCardProvider.load({
      path: path.join(fixturesRoot, "server-card.json")
    });

    expect(result.source.kind).toBe("server-card");
    expect(result.normalized.identity.id).toBe("com.example.memory");
    expect(result.normalized.auth?.issuer).toBe("https://issuer.example.com");
  });

  it("records warnings for missing key identity fields", () => {
    const result = normalizeMetadataRecord(
      {
        description: "missing identity"
      },
      {
        kind: "unknown",
        label: "missing"
      }
    );

    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("scores strong metadata with surfaced trust signals", async () => {
    const result = await serverCardProvider.load({
      path: path.join(fixturesRoot, "server-card.json")
    });

    const assessment = assessMetadataTrust(result.normalized);
    const findings = createTrustFindings(result.normalized, assessment);

    expect(assessment.band).toBe("strong");
    expect(assessment.score).toBe(9);
    expect(assessment.missingSignals).toBe(0);
    expect(findings).toHaveLength(0);
  });

  it("scores weak metadata and emits trust findings", async () => {
    const result = await serverCardProvider.load({
      path: path.join(fixturesRoot, "server-card-weak.json")
    });

    const assessment = assessMetadataTrust(result.normalized);
    const findings = createTrustFindings(result.normalized, assessment);

    expect(assessment.band).toBe("guarded");
    expect(assessment.score).toBe(3);
    expect(assessment.missingSignals).toBe(5);
    expect(findings.map((finding) => finding.ruleId)).toContain("trust.endpoint-https-missing");
    expect(findings.map((finding) => finding.ruleId)).toContain("trust.repository-missing");
  });

  it("respects policy overrides for trust findings", async () => {
    const result = await serverCardProvider.load({
      path: path.join(fixturesRoot, "server-card-weak.json")
    });

    const policy: Policy = {
      version: "1.0.0",
      name: "custom-trust",
      rules: {
        [createRuleId("trust.repository-missing")]: {
          enabled: false,
          severity: Severity.Low
        },
        [createRuleId("trust.endpoint-https-missing")]: {
          enabled: true,
          severity: Severity.Critical
        }
      }
    };

    const assessment = assessMetadataTrust(result.normalized);
    const findings = createTrustFindings(result.normalized, assessment, policy);

    expect(findings.map((finding) => finding.ruleId)).not.toContain("trust.repository-missing");
    expect(findings.find((finding) => finding.ruleId === "trust.endpoint-https-missing")?.severity).toBe("critical");
  });
});
