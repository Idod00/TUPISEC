import { describe, it, expect } from "vitest";
import { compareScans } from "../lib/comparison";
import type { Finding } from "../lib/types";

function makeFinding(category: string, title: string): Finding {
  return {
    severity: "HIGH",
    category,
    title,
    detail: "",
    recommendation: "",
    timestamp: new Date().toISOString(),
  };
}

describe("compareScans", () => {
  it("identifies new findings", () => {
    const a: Finding[] = [];
    const b = [makeFinding("XSS", "Reflected XSS")];
    const result = compareScans(a, b);
    expect(result.newFindings).toHaveLength(1);
    expect(result.resolvedFindings).toHaveLength(0);
    expect(result.persistentFindings).toHaveLength(0);
  });

  it("identifies resolved findings", () => {
    const a = [makeFinding("SQLi", "Injection in login")];
    const b: Finding[] = [];
    const result = compareScans(a, b);
    expect(result.resolvedFindings).toHaveLength(1);
    expect(result.newFindings).toHaveLength(0);
  });

  it("identifies persistent findings", () => {
    const f = makeFinding("Headers", "Missing CSP");
    const result = compareScans([f], [f]);
    expect(result.persistentFindings).toHaveLength(1);
    expect(result.newFindings).toHaveLength(0);
    expect(result.resolvedFindings).toHaveLength(0);
  });

  it("handles mixed scenario", () => {
    const a = [makeFinding("A", "1"), makeFinding("B", "2")];
    const b = [makeFinding("B", "2"), makeFinding("C", "3")];
    const result = compareScans(a, b);
    expect(result.resolvedFindings).toHaveLength(1);
    expect(result.newFindings).toHaveLength(1);
    expect(result.persistentFindings).toHaveLength(1);
  });

  it("returns empty arrays for empty inputs", () => {
    const result = compareScans([], []);
    expect(result.newFindings).toHaveLength(0);
    expect(result.resolvedFindings).toHaveLength(0);
    expect(result.persistentFindings).toHaveLength(0);
  });
});
