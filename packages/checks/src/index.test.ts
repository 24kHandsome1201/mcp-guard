import { describe, expect, it } from "vitest";
import { checksName } from "./index.js";

describe("checks package scaffold", () => {
  it("exports checks marker", () => {
    expect(checksName).toBe("mcp-guard checks");
  });
});
