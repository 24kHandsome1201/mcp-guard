import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";

import { Severity, createRuleId, type Policy } from "@mcp-guard/core";
import { registryContentTypeRuleId, registryMetadataVersionRuleId, registrySchemaInvalidRuleId } from "./registry.js";
import { runRegistryLint } from "./registry.js";

const defaultPolicy: Policy = {
  version: "1.0.0",
  name: "test",
  rules: {
    [createRuleId("registry.endpoint-reachable")]: {
      enabled: true,
      severity: Severity.Medium
    },
    [createRuleId("registry.metadata-version")]: {
      enabled: true,
      severity: Severity.Medium
    },
    [createRuleId("registry.schema-invalid")]: {
      enabled: true,
      severity: Severity.Medium
    },
    [createRuleId("registry.content-type")]: {
      enabled: true,
      severity: Severity.Low
    },
    [createRuleId("registry.cors-header")]: {
      enabled: true,
      severity: Severity.Low
    }
  },
  metadata: {
    defaultSeverity: Severity.Medium
  }
};

function createServerFixture(responseBody: string, headers: Record<string, string> = {}): Promise<{
  endpoint: string;
  close: () => void;
}> {
  const server = createServer((req, res) => {
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
        throw new Error("Unexpected server address");
      }

      const endpoint = `http://127.0.0.1:${address.port}`;
      resolve({
        endpoint,
        close: () => server.close()
      });
    });
  });
}

describe("registry lint command", () => {
  const closers: Array<() => void> = [];

  afterEach(() => {
    closers.forEach((close) => close());
    closers.length = 0;
  });

  it("accepts valid metadata and CORS header", async () => {
    const { endpoint, close } = await createServerFixture('{"version":"1.0.0","name":"mcp"}', {
      "Access-Control-Allow-Origin": "*"
    });
    closers.push(close);

    const report = await runRegistryLint({ endpoint }, defaultPolicy);

    expect(report.findings).toHaveLength(0);
  });

  it("flags missing version and CORS", async () => {
    const { endpoint, close } = await createServerFixture('{"name":"mcp"}');
    closers.push(close);

    const report = await runRegistryLint({ endpoint }, defaultPolicy);

    const hasVersionRule = report.findings.some((finding) => finding.ruleId === "registry.metadata-version");
    const hasCorsRule = report.findings.some((finding) => finding.ruleId === "registry.cors-header");

    expect(hasVersionRule).toBe(true);
    expect(hasCorsRule).toBe(true);
  });

  it("flags invalid JSON", async () => {
    const { endpoint, close } = await createServerFixture("not-json");
    closers.push(close);

    const report = await runRegistryLint({ endpoint }, defaultPolicy);

    expect(report.findings.some((finding) => finding.ruleId === "registry.metadata-version")).toBe(true);
    expect(report.findings[0]?.details?.classification).toBe("invalid-json");
  });

  it("flags missing name and invalid endpoints with schema diagnostics", async () => {
    const { endpoint, close } = await createServerFixture('{"version":"1.0.0","endpoints":[1,""]}');
    closers.push(close);

    const report = await runRegistryLint({ endpoint }, defaultPolicy);
    const schemaFindings = report.findings.filter((finding) => finding.ruleId === registrySchemaInvalidRuleId);

    expect(schemaFindings).toHaveLength(2);
    expect(schemaFindings.map((finding) => finding.details?.path)).toContain("name");
    expect(schemaFindings.map((finding) => finding.details?.path)).toContain("endpoints");
  });

  it("flags unexpected content type with diagnostics", async () => {
    const { endpoint, close } = await createServerFixture('{"version":"1.0.0","name":"mcp"}', {
      "Content-Type": "text/plain",
      "Access-Control-Allow-Origin": "*"
    });
    closers.push(close);

    const report = await runRegistryLint({ endpoint }, defaultPolicy);
    const contentTypeFinding = report.findings.find((finding) => finding.ruleId === registryContentTypeRuleId);

    expect(contentTypeFinding?.status).toBe("warn");
    expect(contentTypeFinding?.details?.classification).toBe("content-type");
  });

  it("supports custom policy severity override", async () => {
    const { endpoint, close } = await createServerFixture('{"name":"mcp"}');
    closers.push(close);

    const customPolicy: Policy = {
      ...defaultPolicy,
      rules: {
        ...defaultPolicy.rules,
        [registryMetadataVersionRuleId]: {
          enabled: true,
          severity: Severity.Critical
        }
      }
    };
    const report = await runRegistryLint({ endpoint }, customPolicy);

    const criticalFinding = report.findings.find((finding) => finding.ruleId === "registry.metadata-version");
    expect(criticalFinding?.severity).toBe("critical");
  });
});
