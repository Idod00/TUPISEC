"use client";

import { ArrowRight } from "lucide-react";
import { getGrade, getGradeColor } from "@/lib/scoring";

interface ScanSummary {
  id: string;
  target_url: string;
  created_at: string;
  risk_score: number | null;
  finding_count: number;
}

interface ComparisonHeaderProps {
  scanA: ScanSummary;
  scanB: ScanSummary;
}

export function ComparisonHeader({ scanA, scanB }: ComparisonHeaderProps) {
  const scoreA = scanA.risk_score;
  const scoreB = scanB.risk_score;
  const gradeA = scoreA != null ? getGrade(scoreA) : null;
  const gradeB = scoreB != null ? getGrade(scoreB) : null;
  const delta = scoreA != null && scoreB != null ? scoreB - scoreA : null;

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Scan A */}
      <div className="flex-1 rounded-lg border border-border/50 p-4 min-w-[200px]">
        <p className="text-xs text-muted-foreground mb-1">Scan A (Baseline)</p>
        <p className="font-mono text-sm truncate">{scanA.target_url}</p>
        <p className="text-xs text-muted-foreground">{new Date(scanA.created_at).toLocaleString()}</p>
        <div className="mt-2 flex items-center gap-2">
          {scoreA != null && gradeA && (
            <span className="font-mono font-bold text-lg" style={{ color: getGradeColor(gradeA) }}>
              {scoreA} ({gradeA})
            </span>
          )}
          <span className="text-sm text-muted-foreground">{scanA.finding_count} findings</span>
        </div>
      </div>

      <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />

      {/* Scan B */}
      <div className="flex-1 rounded-lg border border-border/50 p-4 min-w-[200px]">
        <p className="text-xs text-muted-foreground mb-1">Scan B (Current)</p>
        <p className="font-mono text-sm truncate">{scanB.target_url}</p>
        <p className="text-xs text-muted-foreground">{new Date(scanB.created_at).toLocaleString()}</p>
        <div className="mt-2 flex items-center gap-2">
          {scoreB != null && gradeB && (
            <span className="font-mono font-bold text-lg" style={{ color: getGradeColor(gradeB) }}>
              {scoreB} ({gradeB})
            </span>
          )}
          <span className="text-sm text-muted-foreground">{scanB.finding_count} findings</span>
        </div>
      </div>

      {/* Delta */}
      {delta != null && (
        <div className="rounded-lg border border-border/50 p-4 text-center min-w-[100px]">
          <p className="text-xs text-muted-foreground mb-1">Score Delta</p>
          <span
            className={`font-mono font-bold text-xl ${delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-muted-foreground"}`}
          >
            {delta > 0 ? "+" : ""}{delta}
          </span>
        </div>
      )}
    </div>
  );
}
