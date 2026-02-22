"use client";

import type { FindingStatusRecord } from "@/lib/types";

interface RemediationProgressProps {
  totalFindings: number;
  statuses: FindingStatusRecord[];
}

export function RemediationProgress({ totalFindings, statuses }: RemediationProgressProps) {
  const resolved = statuses.filter((s) => s.status === "resolved").length;
  const inProgress = statuses.filter((s) => s.status === "in_progress").length;
  const accepted = statuses.filter((s) => s.status === "accepted").length;
  const open = totalFindings - resolved - inProgress - accepted;

  const pct = (n: number) => totalFindings > 0 ? (n / totalFindings) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Remediation Progress</span>
        <span className="font-mono text-primary">{resolved} / {totalFindings} resolved</span>
      </div>
      <div className="h-3 w-full rounded-full bg-secondary overflow-hidden flex">
        {pct(resolved) > 0 && (
          <div className="h-full bg-green-500 transition-all" style={{ width: `${pct(resolved)}%` }} />
        )}
        {pct(inProgress) > 0 && (
          <div className="h-full bg-yellow-500 transition-all" style={{ width: `${pct(inProgress)}%` }} />
        )}
        {pct(accepted) > 0 && (
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${pct(accepted)}%` }} />
        )}
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Resolved ({resolved})</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" /> In Progress ({inProgress})</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Accepted ({accepted})</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-500" /> Open ({open})</span>
      </div>
    </div>
  );
}
