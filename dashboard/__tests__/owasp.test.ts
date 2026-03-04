import { describe, it, expect } from "vitest";
import { getOwaspLink, getOwaspMap } from "../lib/owasp";

describe("getOwaspLink", () => {
  it("returns mapping for SQL Injection", () => {
    const result = getOwaspLink("SQL Injection");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("A03:2021");
    expect(result!.name).toBe("Injection");
  });

  it("returns mapping for CSRF", () => {
    const result = getOwaspLink("CSRF");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("A01:2021");
  });

  it("returns null for unknown category", () => {
    expect(getOwaspLink("Unknown Category")).toBeNull();
  });
});

describe("getOwaspMap", () => {
  it("contains at least 10 mappings", () => {
    const map = getOwaspMap();
    expect(Object.keys(map).length).toBeGreaterThanOrEqual(10);
  });

  it("all entries have required fields", () => {
    const map = getOwaspMap();
    for (const [key, value] of Object.entries(map)) {
      expect(value.id).toBeTruthy();
      expect(value.name).toBeTruthy();
      expect(value.url).toContain("owasp.org");
    }
  });
});
