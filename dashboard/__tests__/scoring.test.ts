import { describe, it, expect } from "vitest";
import { calculateScore, getGrade, getGradeColor } from "../lib/scoring";
import type { ScanReport, Finding } from "../lib/types";

function makeFinding(severity: Finding["severity"]): Finding {
  return {
    severity,
    category: "Test",
    title: "Test finding",
    detail: "Detail",
    recommendation: "",
    timestamp: new Date().toISOString(),
  };
}

function makeReport(findings: Finding[]): ScanReport {
  return {
    target: "https://example.com",
    base_url: "https://example.com",
    scan_date: new Date().toISOString(),
    summary: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
    tech_stack: {},
    discovered_urls: [],
    findings,
  };
}

describe("calculateScore", () => {
  it("returns 100 for no findings", () => {
    expect(calculateScore(makeReport([]))).toBe(100);
  });

  it("deducts 25 per CRITICAL", () => {
    expect(calculateScore(makeReport([makeFinding("CRITICAL")]))).toBe(75);
  });

  it("deducts 15 per HIGH", () => {
    expect(calculateScore(makeReport([makeFinding("HIGH")]))).toBe(85);
  });

  it("deducts 5 per MEDIUM", () => {
    expect(calculateScore(makeReport([makeFinding("MEDIUM")]))).toBe(95);
  });

  it("never goes below 0", () => {
    const findings = Array(10).fill(null).map(() => makeFinding("CRITICAL"));
    expect(calculateScore(makeReport(findings))).toBe(0);
  });

  it("INFO findings do not deduct", () => {
    expect(calculateScore(makeReport([makeFinding("INFO")]))).toBe(100);
  });
});

describe("getGrade", () => {
  it("returns A for 90-100", () => {
    expect(getGrade(100)).toBe("A");
    expect(getGrade(90)).toBe("A");
  });

  it("returns B for 75-89", () => {
    expect(getGrade(89)).toBe("B");
    expect(getGrade(75)).toBe("B");
  });

  it("returns C for 60-74", () => {
    expect(getGrade(74)).toBe("C");
    expect(getGrade(60)).toBe("C");
  });

  it("returns D for 40-59", () => {
    expect(getGrade(59)).toBe("D");
    expect(getGrade(40)).toBe("D");
  });

  it("returns F for below 40", () => {
    expect(getGrade(39)).toBe("F");
    expect(getGrade(0)).toBe("F");
  });
});

describe("getGradeColor", () => {
  it("returns green for A", () => {
    expect(getGradeColor("A")).toBe("#22c55e");
  });

  it("returns red for F", () => {
    expect(getGradeColor("F")).toBe("#ef4444");
  });
});
