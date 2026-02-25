"use client";

import { useState } from "react";
import {
  Activity, Trash2, RefreshCw, Loader2,
  CheckCircle, XCircle, Clock,
  ExternalLink, ChevronDown, ChevronUp, History,
  Power, Pencil, Save, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import type { AppMonitorRecord, AppCheckResult, AppCheckHistoryRecord, AppMonitorInterval } from "@/lib/types";

type SafeMonitor = Omit<AppMonitorRecord, "password_enc">;

interface Props {
  monitor: SafeMonitor;
  onDelete: (id: string) => void;
  onCheckNow: (id: string) => Promise<{ status: string; result: AppCheckResult } | null>;
  onToggleEnabled: (id: string, enabled: boolean) => Promise<void>;
  onUpdate: (id: string, fields: {
    name?: string;
    url?: string;
    username?: string;
    password?: string;
    interval?: AppMonitorInterval;
    notify_email?: string | null;
    enabled?: number;
  }) => Promise<SafeMonitor | null>;
}

const INTERVAL_OPTIONS: { value: AppMonitorInterval; label: string }[] = [
  { value: "5min",  label: "5 min" },
  { value: "15min", label: "15 min" },
  { value: "30min", label: "30 min" },
  { value: "1h",    label: "1 hora" },
  { value: "6h",    label: "6 horas" },
  { value: "1d",    label: "Diario" },
];

function UptimeDots({ history }: { history: AppCheckHistoryRecord[] }) {
  const dots = history.slice(0, 20).reverse();
  return (
    <div className="flex gap-0.5 items-center flex-wrap">
      {dots.map((h) => (
        <div
          key={h.id}
          title={`${new Date(h.checked_at).toLocaleString()} — ${h.status.toUpperCase()}${h.response_ms ? ` (${h.response_ms}ms)` : ""}${h.error ? ` — ${h.error}` : ""}`}
          className={cn(
            "w-2 h-4 rounded-sm flex-shrink-0",
            h.status === "up" ? "bg-green-500" : "bg-red-500"
          )}
        />
      ))}
      {dots.length === 0 && (
        <span className="text-xs text-muted-foreground italic">—</span>
      )}
    </div>
  );
}

export function AppMonitorCard({ monitor, onDelete, onCheckNow, onToggleEnabled, onUpdate }: Props) {
  const { t } = useI18n();

  const [checking, setChecking] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentMonitor, setCurrentMonitor] = useState(monitor);
  const [latestResult, setLatestResult] = useState<AppCheckResult | null>(null);
  const [latestStatus, setLatestStatus] = useState<"up" | "down" | null>(monitor.last_status);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<AppCheckHistoryRecord[] | null>(null);
  const [uptime24h, setUptime24h] = useState<number>(-1);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: monitor.name,
    url: monitor.url,
    username: monitor.username,
    password: "",          // blank = don't change
    interval: monitor.interval,
    notify_email: monitor.notify_email ?? "",
    enabled: monitor.enabled === 1,
  });

  const loadHistory = async () => {
    if (history !== null) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/app-monitors/${currentMonitor.id}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history);
        setUptime24h(data.uptime24h);
      }
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
        setLatestStatus(res.status as "up" | "down");
        setCurrentMonitor((m) => ({
          ...m,
          last_status: res.status as "up" | "down",
          last_response_ms: res.result.response_ms,
          last_check: res.result.checked_at,
        }));
        setHistory(null); // invalidate so it reloads
      }
    } finally {
      setChecking(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    const newEnabled = currentMonitor.enabled === 0;
    try {
      await onToggleEnabled(currentMonitor.id, newEnabled);
      setCurrentMonitor((m) => ({ ...m, enabled: newEnabled ? 1 : 0 }));
    } finally {
      setToggling(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fields: Parameters<typeof onUpdate>[1] = {
        name: editForm.name,
        url: editForm.url,
        username: editForm.username,
        interval: editForm.interval,
        notify_email: editForm.notify_email || null,
        enabled: editForm.enabled ? 1 : 0,
      };
      if (editForm.password) {
        fields.password = editForm.password;
      }
      const updated = await onUpdate(currentMonitor.id, fields);
      if (updated) {
        setCurrentMonitor(updated);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditForm({
      name: currentMonitor.name,
      url: currentMonitor.url,
      username: currentMonitor.username,
      password: "",
      interval: currentMonitor.interval,
      notify_email: currentMonitor.notify_email ?? "",
      enabled: currentMonitor.enabled === 1,
    });
    setEditing(false);
  };

  const status = latestStatus ?? currentMonitor.last_status;
  const responseMs = latestResult?.response_ms ?? currentMonitor.last_response_ms;
  const error = latestResult?.error ?? (status === "down" && !latestResult ? null : null);

  const StatusIcon = status === "up" ? CheckCircle : status === "down" ? XCircle : Activity;
  const iconColor =
    status === "up" ? "text-green-400"
    : status === "down" ? "text-red-400"
    : "text-muted-foreground";

  const stripColor =
    status === "up" ? "bg-green-500"
    : status === "down" ? "bg-red-500"
    : "bg-muted";

  const badgeClass =
    status === "up" ? "bg-green-500/10 text-green-400"
    : status === "down" ? "bg-red-500/10 text-red-400"
    : "bg-muted text-muted-foreground";

  const badgeLabel =
    status === "up" ? t("monitors.status.up")
    : status === "down" ? t("monitors.status.down")
    : t("ssl.notChecked");

  let displayUrl = currentMonitor.url;
  try {
    const parsed = new URL(currentMonitor.url);
    displayUrl = parsed.hostname + (parsed.pathname !== "/" ? parsed.pathname : "");
  } catch {}

  return (
    <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
      {/* Color strip */}
      <div className={cn("h-1 w-full", stripColor)} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <StatusIcon className={cn("h-4 w-4 flex-shrink-0", iconColor)} />
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{currentMonitor.name}</p>
              <a
                href={currentMonitor.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                title={currentMonitor.url}
              >
                <span className="truncate max-w-[180px]">{displayUrl}</span>
                <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {currentMonitor.enabled === 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {t("ssl.disabled")}
              </span>
            )}
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", badgeClass)}>
              {badgeLabel}
            </span>
          </div>
        </div>

        {/* Error message */}
        {status === "down" && latestResult?.error && (
          <p className="text-xs text-red-400 bg-red-500/10 rounded-md px-2 py-1.5 mb-3 font-mono break-all">
            {latestResult.error}
          </p>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 text-xs">
          <div>
            <span className="text-muted-foreground">{t("monitors.responseMs")}</span>
            <p className="font-medium font-mono">
              {responseMs != null ? `${responseMs}ms` : "—"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">{t("monitors.uptime24h")}</span>
            <p className={cn(
              "font-medium",
              uptime24h >= 99 ? "text-green-400"
              : uptime24h >= 90 ? "text-yellow-400"
              : uptime24h >= 0 ? "text-red-400"
              : ""
            )}>
              {uptime24h >= 0 ? `${uptime24h}%` : "—"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">{t("monitors.lastCheck")}</span>
            <p className="font-medium">
              {currentMonitor.last_check
                ? new Date(currentMonitor.last_check).toLocaleTimeString()
                : "—"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">{t("monitors.nextCheck")}</span>
            <p className="font-medium">
              {currentMonitor.next_check && currentMonitor.enabled
                ? new Date(currentMonitor.next_check).toLocaleTimeString()
                : "—"}
            </p>
          </div>
        </div>

        {/* History toggle */}
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
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("ssl.historyLoading")}
              </div>
            ) : !history || history.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("ssl.historyEmpty")}</p>
            ) : (
              <div className="space-y-2">
                <UptimeDots history={history} />
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {history.slice(0, 20).map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2 text-xs rounded-md bg-muted/40 px-2 py-1.5">
                      <span className={cn(
                        "inline-block w-2 h-2 rounded-full flex-shrink-0",
                        entry.status === "up" ? "bg-green-400" : "bg-red-400"
                      )} />
                      <span className="text-muted-foreground tabular-nums w-32 flex-shrink-0">
                        {new Date(entry.checked_at).toLocaleString()}
                      </span>
                      <span className={cn(
                        "font-medium w-10 flex-shrink-0",
                        entry.status === "up" ? "text-green-400" : "text-red-400"
                      )}>
                        {entry.status === "up" ? t("monitors.status.up") : t("monitors.status.down")}
                      </span>
                      {entry.response_ms != null && (
                        <span className="text-muted-foreground">{entry.response_ms}ms</span>
                      )}
                      {entry.error && (
                        <span className="text-red-400 truncate">{entry.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Edit panel ── */}
        {editing && (
          <>
            <Separator className="my-3" />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">{t("monitors.name")}</label>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">{t("monitors.url")}</label>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    value={editForm.url}
                    onChange={(e) => setEditForm((f) => ({ ...f, url: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t("monitors.username")}</label>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={editForm.username}
                    onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    {t("monitors.password")} <span className="text-muted-foreground/60">(vacío = no cambiar)</span>
                  </label>
                  <input
                    type="password"
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="••••••••"
                    value={editForm.password}
                    onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t("monitors.interval")}</label>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={editForm.interval}
                    onChange={(e) => setEditForm((f) => ({ ...f, interval: e.target.value as AppMonitorInterval }))}
                  >
                    {INTERVAL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t("monitors.alertEmail")}</label>
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
                <Button size="sm" onClick={handleSave} disabled={saving || !editForm.name || !editForm.url}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                  {t("common.save")}
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEdit}>
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
            <span className="text-muted-foreground capitalize">
              {currentMonitor.interval} · {currentMonitor.username}
              {currentMonitor.notify_email && " · ✉"}
            </span>
          </div>
          <div className="flex gap-1.5">
            <Button
              variant={editing ? "default" : "outline"}
              size="sm"
              onClick={() => setEditing((v) => !v)}
              title={editing ? t("common.cancel") : "Edit"}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggle}
              disabled={toggling}
              title={currentMonitor.enabled ? t("monitors.disable") : t("monitors.enable")}
            >
              {toggling
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Power className={cn("h-3.5 w-3.5", currentMonitor.enabled ? "text-green-400" : "text-muted-foreground")} />
              }
            </Button>
            <Button variant="outline" size="sm" onClick={handleCheckNow} disabled={checking}>
              {checking
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <RefreshCw className="h-3.5 w-3.5" />
              }
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
