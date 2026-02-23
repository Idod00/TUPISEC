"use client";

import { useState } from "react";
import {
  LockKeyhole, LockOpen, Trash2, RefreshCw, Loader2, AlertTriangle,
  CheckCircle, XCircle, Clock, Calendar, Pencil, Save, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { SSLMonitorRecord, SSLCheckResult } from "@/lib/types";

interface Props {
  monitor: SSLMonitorRecord;
  onDelete: (id: string) => void;
  onCheckNow: (id: string) => Promise<{ status: string; result: SSLCheckResult } | null>;
  onUpdate: (id: string, fields: Partial<SSLMonitorRecord>) => Promise<SSLMonitorRecord | null>;
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

export function SSLMonitorCard({ monitor, onDelete, onCheckNow, onUpdate }: Props) {
  const [checking, setChecking] = useState(false);
  const [latestResult, setLatestResult] = useState<SSLCheckResult | null>(null);
  const [latestStatus, setLatestStatus] = useState<string | null>(monitor.last_status);
  const [latestDays, setLatestDays] = useState<number | null>(monitor.last_days_remaining);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    domain: monitor.domain,
    port: monitor.port,
    interval: monitor.interval as "daily" | "weekly" | "monthly",
    notify_days_before: monitor.notify_days_before,
    notify_email: monitor.notify_email ?? "",
    enabled: monitor.enabled === 1,
  });
  const [currentMonitor, setCurrentMonitor] = useState(monitor);

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      const res = await onCheckNow(currentMonitor.id);
      if (res) {
        setLatestResult(res.result);
        setLatestStatus(res.status);
        setLatestDays(res.result.days_remaining);
      }
    } finally {
      setChecking(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await onUpdate(currentMonitor.id, {
        domain: editForm.domain,
        port: editForm.port,
        interval: editForm.interval,
        notify_days_before: editForm.notify_days_before,
        notify_email: editForm.notify_email || null,
        enabled: editForm.enabled ? 1 : 0,
      });
      if (updated) {
        setCurrentMonitor(updated);
        setEditing(false);
      }
    } finally {
      setSaving(false);
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
            <p className="font-semibold text-sm font-mono">{currentMonitor.domain}</p>
            {currentMonitor.port !== 443 && (
              <p className="text-xs text-muted-foreground">port {currentMonitor.port}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentMonitor.enabled === 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Disabled</span>
          )}
          <StatusBadge status={latestStatus} />
        </div>
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

      {/* Edit panel */}
      {editing && (
        <>
          <Separator className="my-3" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Domain</label>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  value={editForm.domain}
                  onChange={(e) => setEditForm((f) => ({ ...f, domain: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Port</label>
                <input
                  type="number"
                  min={1}
                  max={65535}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={editForm.port}
                  onChange={(e) => setEditForm((f) => ({ ...f, port: parseInt(e.target.value) || 443 }))}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Interval</label>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={editForm.interval}
                  onChange={(e) => setEditForm((f) => ({ ...f, interval: e.target.value as "daily" | "weekly" | "monthly" }))}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Alert days before expiry</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={editForm.notify_days_before}
                  onChange={(e) => setEditForm((f) => ({ ...f, notify_days_before: parseInt(e.target.value) || 14 }))}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Alert email (optional)</label>
                <input
                  type="email"
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="you@example.com"
                  value={editForm.notify_email}
                  onChange={(e) => setEditForm((f) => ({ ...f, notify_email: e.target.value }))}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.enabled}
                onChange={(e) => setEditForm((f) => ({ ...f, enabled: e.target.checked }))}
                className="rounded"
              />
              <span className="text-muted-foreground">Monitor enabled</span>
            </label>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving || !editForm.domain}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                setEditing(false);
                setEditForm({
                  domain: currentMonitor.domain,
                  port: currentMonitor.port,
                  interval: currentMonitor.interval as "daily" | "weekly" | "monthly",
                  notify_days_before: currentMonitor.notify_days_before,
                  notify_email: currentMonitor.notify_email ?? "",
                  enabled: currentMonitor.enabled === 1,
                });
              }}>
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <div className={cn("flex items-center justify-between border-t border-border/40", editing ? "pt-3 mt-3" : "pt-2 mt-0")}>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {currentMonitor.last_check
              ? new Date(currentMonitor.last_check).toLocaleString()
              : "Never checked"}
          </span>
          <span className="capitalize">{currentMonitor.interval}</span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Alerts: {currentMonitor.notify_days_before}d
          </span>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant={editing ? "default" : "outline"}
            size="sm"
            onClick={() => setEditing((v) => !v)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleCheckNow} disabled={checking}>
            {checking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(currentMonitor.id)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}
