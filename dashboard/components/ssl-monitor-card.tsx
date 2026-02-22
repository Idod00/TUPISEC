"use client";

import { useState } from "react";
import { LockKeyhole, LockOpen, Trash2, RefreshCw, Loader2, AlertTriangle, CheckCircle, XCircle, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SSLMonitorRecord, SSLCheckResult } from "@/lib/types";

interface Props {
  monitor: SSLMonitorRecord;
  onDelete: (id: string) => void;
  onCheckNow: (id: string) => Promise<{ status: string; result: SSLCheckResult } | null>;
}

function DaysBar({ days }: { days: number | null }) {
  if (days === null) return null;
  const capped = Math.max(0, Math.min(days, 90));
  const pct = Math.round((capped / 90) * 100);
  const color =
    days < 0
      ? "bg-red-500"
      : days <= 7
      ? "bg-red-400"
      : days <= 14
      ? "bg-orange-400"
      : days <= 30
      ? "bg-yellow-400"
      : "bg-green-500";

  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status)
    return (
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        Not checked
      </span>
    );
  const map = {
    ok: "bg-green-500/10 text-green-400",
    warning: "bg-yellow-500/10 text-yellow-400",
    error: "bg-red-500/10 text-red-400",
  };
  const labels = { ok: "OK", warning: "Warning", error: "Error" };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", map[status as keyof typeof map] ?? "bg-muted text-muted-foreground")}>
      {labels[status as keyof typeof labels] ?? status}
    </span>
  );
}

export function SSLMonitorCard({ monitor, onDelete, onCheckNow }: Props) {
  const [checking, setChecking] = useState(false);
  const [latestResult, setLatestResult] = useState<SSLCheckResult | null>(null);
  const [latestStatus, setLatestStatus] = useState<string | null>(monitor.last_status);
  const [latestDays, setLatestDays] = useState<number | null>(monitor.last_days_remaining);

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      const res = await onCheckNow(monitor.id);
      if (res) {
        setLatestResult(res.result);
        setLatestStatus(res.status);
        setLatestDays(res.result.days_remaining);
      }
    } finally {
      setChecking(false);
    }
  };

  const result = latestResult;
  const StatusIcon =
    latestStatus === "ok"
      ? CheckCircle
      : latestStatus === "warning"
      ? AlertTriangle
      : latestStatus === "error"
      ? XCircle
      : LockKeyhole;

  const iconColor =
    latestStatus === "ok"
      ? "text-green-400"
      : latestStatus === "warning"
      ? "text-yellow-400"
      : latestStatus === "error"
      ? "text-red-400"
      : "text-muted-foreground";

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn("h-4 w-4 flex-shrink-0", iconColor)} />
          <div>
            <p className="font-semibold text-sm font-mono">{monitor.domain}</p>
            {monitor.port !== 443 && (
              <p className="text-xs text-muted-foreground">port {monitor.port}</p>
            )}
          </div>
        </div>
        <StatusBadge status={latestStatus} />
      </div>

      {/* Days remaining */}
      {latestDays !== null && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>
              {latestDays < 0
                ? `Expired ${Math.abs(latestDays)} days ago`
                : `${latestDays} days remaining`}
            </span>
          </div>
          <DaysBar days={latestDays} />
        </div>
      )}

      {/* Error message */}
      {result?.error && (
        <p className="text-xs text-red-400 bg-red-500/10 rounded-md px-2 py-1 mb-3 font-mono">
          {result.error}
        </p>
      )}

      {/* Cert details */}
      {result && !result.error && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3 text-xs">
          <div>
            <span className="text-muted-foreground">Issuer</span>
            <p className="font-medium truncate">{result.issuer?.O ?? result.issuer?.CN ?? "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Expires</span>
            <p className="font-medium">
              {result.valid_to ? new Date(result.valid_to).toLocaleDateString() : "—"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Protocol</span>
            <p className="font-mono font-medium">{result.protocol}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Chain</span>
            <p className={cn("font-medium", result.chain_valid ? "text-green-400" : "text-red-400")}>
              {result.chain_valid ? "Valid" : "Invalid"}
            </p>
          </div>
          {result.sans.length > 0 && (
            <div className="col-span-2">
              <span className="text-muted-foreground">SANs</span>
              <p className="font-mono text-xs truncate">{result.sans.slice(0, 3).join(", ")}{result.sans.length > 3 ? ` +${result.sans.length - 3}` : ""}</p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {monitor.last_check
              ? new Date(monitor.last_check).toLocaleString()
              : "Never checked"}
          </span>
          <span className="capitalize">{monitor.interval}</span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Alerts: {monitor.notify_days_before}d
          </span>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={handleCheckNow} disabled={checking}>
            {checking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(monitor.id)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}
