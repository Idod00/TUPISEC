"use client";

import { useState, useEffect } from "react";
import {
  LockKeyhole, Trash2, RefreshCw, Loader2, AlertTriangle,
  CheckCircle, XCircle, Clock, Calendar, Pencil, Save, X,
  ChevronDown, ChevronUp, History, Shield, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import type { SSLMonitorRecord, SSLCheckResult, SSLCheckHistoryRecord } from "@/lib/types";

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
    days < 0 ? "bg-red-500"
    : days <= 7 ? "bg-red-400"
    : days <= 14 ? "bg-orange-400"
    : days <= 30 ? "bg-yellow-400"
    : "bg-green-500";
  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function MiniStatusDot({ status }: { status: string }) {
  const color =
    status === "ok" ? "bg-green-400"
    : status === "warning" ? "bg-yellow-400"
    : "bg-red-400";
  return <span className={cn("inline-block w-2 h-2 rounded-full flex-shrink-0", color)} />;
}

export function SSLMonitorCard({ monitor, onDelete, onCheckNow, onUpdate }: Props) {
  const { t } = useI18n();

  const initResult = monitor.last_result_json ? (JSON.parse(monitor.last_result_json) as SSLCheckResult) : null;

  const [checking, setChecking] = useState(false);
  const [latestResult, setLatestResult] = useState<SSLCheckResult | null>(initResult);
  const [latestStatus, setLatestStatus] = useState<string | null>(monitor.last_status);
  const [latestDays, setLatestDays] = useState<number | null>(monitor.last_days_remaining);
  const [currentMonitor, setCurrentMonitor] = useState(monitor);

  // Panels
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<SSLCheckHistoryRecord[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  const loadHistory = async () => {
    if (history !== null) return; // already loaded
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/ssl-monitors/${currentMonitor.id}/history`);
      if (res.ok) setHistory(await res.json());
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleHistory = () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next) loadHistory();
  };

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      const res = await onCheckNow(currentMonitor.id);
      if (res) {
        setLatestResult(res.result);
        setLatestStatus(res.status);
        setLatestDays(res.result.days_remaining);
        // Invalidate history so it reloads
        setHistory(null);
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

  const statusLabel =
    latestStatus === "ok" ? t("ssl.status.ok")
    : latestStatus === "warning" ? t("ssl.status.warning")
    : latestStatus === "error" ? t("ssl.status.error")
    : null;

  const StatusIcon =
    latestStatus === "ok" ? CheckCircle
    : latestStatus === "warning" ? AlertTriangle
    : latestStatus === "error" ? XCircle
    : LockKeyhole;

  const iconColor =
    latestStatus === "ok" ? "text-green-400"
    : latestStatus === "warning" ? "text-yellow-400"
    : latestStatus === "error" ? "text-red-400"
    : "text-muted-foreground";

  const statusBadgeColor: Record<string, string> = {
    ok: "bg-green-500/10 text-green-400",
    warning: "bg-yellow-500/10 text-yellow-400",
    error: "bg-red-500/10 text-red-400",
  };

  const result = latestResult;

  return (
    <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
      {/* Header strip */}
      <div className={cn(
        "h-1 w-full",
        latestStatus === "ok" ? "bg-green-500"
        : latestStatus === "warning" ? "bg-yellow-400"
        : latestStatus === "error" ? "bg-red-500"
        : "bg-muted"
      )} />

      <div className="p-4">
        {/* Title row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <StatusIcon className={cn("h-4 w-4 flex-shrink-0", iconColor)} />
            <div className="min-w-0">
              <p className="font-semibold text-sm font-mono truncate">{currentMonitor.domain}</p>
              <p className="text-xs text-muted-foreground">
                {currentMonitor.port !== 443 ? `port ${currentMonitor.port} · ` : ""}
                <span className="capitalize">{currentMonitor.interval}</span>
                {currentMonitor.notify_email && (
                  <span className="ml-1">· ✉</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {currentMonitor.enabled === 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {t("ssl.disabled")}
              </span>
            )}
            {latestStatus ? (
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusBadgeColor[latestStatus] ?? "bg-muted text-muted-foreground")}>
                {statusLabel}
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {t("ssl.notChecked")}
              </span>
            )}
          </div>
        </div>

        {/* Days remaining bar */}
        {latestDays !== null && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span className={cn(latestDays < 0 ? "text-red-400" : latestDays <= 14 ? "text-orange-400" : "")}>
                {latestDays < 0
                  ? t("ssl.expiredAgo").replace("{n}", String(Math.abs(latestDays)))
                  : t("ssl.daysRemaining").replace("{n}", String(latestDays))}
              </span>
              {result?.valid_to && (
                <span>{t("ssl.expires")}: {new Date(result.valid_to).toLocaleDateString()}</span>
              )}
            </div>
            <DaysBar days={latestDays} />
          </div>
        )}

        {/* Error */}
        {result?.error && (
          <p className="text-xs text-red-400 bg-red-500/10 rounded-md px-2 py-1.5 mb-3 font-mono break-all">
            {result.error}
          </p>
        )}

        {/* Quick cert summary — always visible if we have data */}
        {result && !result.error && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3 text-xs">
            <div>
              <span className="text-muted-foreground">{t("ssl.issuer")}</span>
              <p className="font-medium truncate">{result.issuer?.O ?? result.issuer?.CN ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("ssl.protocol")}</span>
              <p className="font-mono font-medium">{result.protocol ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("ssl.chain")}</span>
              <p className={cn("font-medium", result.chain_valid ? "text-green-400" : "text-red-400")}>
                {result.chain_valid ? t("ssl.chainValid") : t("ssl.chainInvalid")}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("ssl.cipher")}</span>
              <p className="font-mono text-xs truncate">{result.cipher ?? "—"}</p>
            </div>
          </div>
        )}

        {/* Expandable: full details */}
        {result && !result.error && (
          <button
            className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 border-t border-border/40"
            onClick={() => setShowDetails((v) => !v)}
          >
            <span className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              {t("ssl.details")}
            </span>
            {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}

        {showDetails && result && !result.error && (
          <div className="grid grid-cols-1 gap-1.5 py-2 text-xs">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div>
                <span className="text-muted-foreground">{t("ssl.validFrom")}</span>
                <p className="font-medium">{result.valid_from ? new Date(result.valid_from).toLocaleDateString() : "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("ssl.expires")}</span>
                <p className="font-medium">{result.valid_to ? new Date(result.valid_to).toLocaleDateString() : "—"}</p>
              </div>
              {result.sans.length > 0 && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">{t("ssl.sans")}</span>
                  <p className="font-mono text-xs break-all">{result.sans.join(", ")}</p>
                </div>
              )}
              <div className="col-span-2">
                <span className="text-muted-foreground">{t("ssl.serial")}</span>
                <p className="font-mono text-xs break-all">{result.serial_number ?? "—"}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">{t("ssl.fingerprint")}</span>
                <p className="font-mono text-xs break-all">{result.fingerprint ?? "—"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Expandable: history */}
        <button
          className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 border-t border-border/40"
          onClick={toggleHistory}
        >
          <span className="flex items-center gap-1">
            <History className="h-3 w-3" />
            {t("ssl.history")}
          </span>
          {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {showHistory && (
          <div className="py-2">
            {historyLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("ssl.historyLoading")}
              </div>
            ) : !history || history.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">{t("ssl.historyEmpty")}</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {history.map((entry) => {
                  const r: SSLCheckResult = JSON.parse(entry.result_json);
                  return (
                    <div key={entry.id} className="flex items-center gap-2 text-xs rounded-md bg-muted/40 px-2 py-1.5">
                      <MiniStatusDot status={entry.status} />
                      <span className="text-muted-foreground tabular-nums w-32 flex-shrink-0">
                        {new Date(entry.checked_at).toLocaleString()}
                      </span>
                      <span className={cn(
                        "font-medium w-14 flex-shrink-0",
                        entry.status === "ok" ? "text-green-400"
                        : entry.status === "warning" ? "text-yellow-400"
                        : "text-red-400"
                      )}>
                        {entry.status === "ok" ? t("ssl.status.ok")
                          : entry.status === "warning" ? t("ssl.status.warning")
                          : t("ssl.status.error")}
                      </span>
                      {entry.days_remaining !== null && (
                        <span className="text-muted-foreground">
                          {entry.days_remaining >= 0
                            ? t("ssl.daysRemaining").replace("{n}", String(entry.days_remaining))
                            : t("ssl.expiredAgo").replace("{n}", String(Math.abs(entry.days_remaining)))}
                        </span>
                      )}
                      {r.error && (
                        <span className="text-red-400 truncate">{r.error}</span>
                      )}
                    </div>
                  );
                })}
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
                  <label className="block text-xs text-muted-foreground mb-1">{t("ssl.domain")}</label>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    value={editForm.domain}
                    onChange={(e) => setEditForm((f) => ({ ...f, domain: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t("ssl.port")}</label>
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
                  <label className="block text-xs text-muted-foreground mb-1">{t("schedules.interval")}</label>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={editForm.interval}
                    onChange={(e) => setEditForm((f) => ({ ...f, interval: e.target.value as "daily" | "weekly" | "monthly" }))}
                  >
                    <option value="daily">{t("schedules.daily")}</option>
                    <option value="weekly">{t("schedules.weekly")}</option>
                    <option value="monthly">{t("schedules.monthly")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t("ssl.alertDays")}</label>
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
                  <label className="block text-xs text-muted-foreground mb-1">{t("ssl.alertEmail")}</label>
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
                <span className="text-muted-foreground">{t("ssl.edit.enabled")}</span>
              </label>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving || !editForm.domain}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                  {t("common.save")}
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
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/40">
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {currentMonitor.last_check
                ? new Date(currentMonitor.last_check).toLocaleString()
                : t("ssl.neverChecked")}
            </span>
            {currentMonitor.next_check && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {t("ssl.nextCheck")}: {new Date(currentMonitor.next_check).toLocaleString()}
              </span>
            )}
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
    </div>
  );
}
