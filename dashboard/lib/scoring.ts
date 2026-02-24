import type { ScanReport, Severity } from "./types";

const DEDUCTIONS: Record<Severity, number> = {
  CRITICAL: 25,
  HIGH: 15,
  MEDIUM: 5,
  LOW: 2,
  INFO: 0,
};

export function calculateScore(report: ScanReport): number {
  let score = 100;
  for (const finding of report.findings) {
    score -= DEDUCTIONS[finding.severity] || 0;
  }
  return Math.max(0, Math.min(100, score));
}

export type Grade = "A" | "B" | "C" | "D" | "F";

export function getGrade(score: number): Grade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

export function getGradeColor(grade: Grade): string {
  switch (grade) {
    case "A": return "#22c55e";
    case "B": return "#3b82f6";
    case "C": return "#eab308";
    case "D": return "#f97316";
    case "F": return "#ef4444";
  }
}
