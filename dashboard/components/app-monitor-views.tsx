"use client";

import { useState } from "react";
import {
  CheckCircle, XCircle, Activity,
  Loader2, RefreshCw, Trash2, Pencil,
  Power, Globe, LogIn,
  ChevronUp, ChevronDown, ArrowUpDown,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import type { AppMonitorRecord, AppCheckResult, AppMonitorInterval } from "@/lib/types";

type SafeMonitor = Omit<AppMonitorRecord, "password_enc">;

// ─── Shared types ─────────────────────────────────────────────────────

interface AppMonitorActions {
  onDelete: (id: string) => void;
  onCheckNow: (id: string) => Promise<{ status: string; availability: AppCheckResult; login: AppCheckResult } | null>;
  onToggleEnabled: (id: string, enabled: boolean) => Promise<void>;
  onEditRequest: (id: string) => void;
}

// ─── Shared helpers ──────────────────────────────────────────────────

function StatusDot({ status }: { status: "up" | "down" | null }) {
  const color =
    status === "up"   ? "bg-green-400"
    : status === "down" ? "bg-red-400"
    : "bg-muted-foreground/40";
  return <span className={cn("inline-block w-2 h-2 rounded-full flex-shrink-0", color)} />;
}

function OverallBadge({ status }: { status: "up" | "down" | null }) {
  if (!status) return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">—</span>
  );
  return (
    <span className={cn(
      "rounded-full px-2 py-0.5 text-xs font-semibold",
      status === "up" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
    )}>
      {status.toUpperCase()}
    </span>
  );
}

function CheckStatusPill({
  type, status,
}: {
  type: "availability" | "login";
  status: "up" | "down" | null;
}) {
  const label = type === "availability" ? "GET" : "POST";
  const Icon = type === "availability" ? Globe : LogIn;
  const upColor = type === "availability" ? "text-blue-400 bg-blue-500/10" : "text-green-400 bg-green-500/10";
  const base = cn(
    "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold font-mono",
    status === "up" ? upColor : status === "down" ? "text-red-400 bg-red-500/10" : "text-muted-foreground bg-muted/40"
  );
  return (
    <span className={base}>
      <Icon className="h-2.5 w-2.5" />
      {label} {status ? status.toUpperCase() : "—"}
    </span>
  );
}

function displayUrl(url: string): string {
  try {
    const p = new URL(url);
    return p.hostname + (p.pathname !== "/" ? p.pathname : "");
  } catch {
    return url;
  }
}

// ─── COMPACT VIEW ────────────────────────────────────────────────────
// Small dense cards — 2-4 columns, status + GET/POST pills + ms + actions

export function AppCompactCard({ monitor, onDelete, onCheckNow, onToggleEnabled }: { monitor: SafeMonitor } & Pick<AppMonitorActions, "onDelete" | "onCheckNow" | "onToggleEnabled">) {
  const [checking, setChecking] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [current, setCurrent] = useState(monitor);

  const check = async () => {
    setChecking(true);
    try {
      const res = await onCheckNow(current.id);
      if (res) {
        setCurrent((m) => ({
          ...m,
          last_status: res.status as "up" | "down",
          last_login_status: res.login.status as "up" | "down",
          last_response_ms: res.availability.response_ms,
          last_check: res.availability.checked_at,
        }));
      }
    } finally { setChecking(false); }
  };

  const toggle = async () => {
    setToggling(true);
    const next = current.enabled === 0;
    try {
      await onToggleEnabled(current.id, next);
      setCurrent((m) => ({ ...m, enabled: next ? 1 : 0 }));
    } finally { setToggling(false); }
  };

  const borderColor =
    current.last_status === "up"   ? "border-green-500/40"
    : current.last_status === "down" ? "border-red-500/40"
    : "border-border/60";

  return (
    <div className={cn("rounded-lg border bg-card p-3 flex flex-col gap-2", borderColor)}>
      {/* Name + status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <StatusDot status={current.last_status} />
          <span className="text-xs font-semibold truncate">{current.name}</span>
        </div>
        <OverallBadge status={current.last_status} />
      </div>

      {/* URL */}
      <a
        href={current.url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-mono truncate"
        title={current.url}
      >
        <span className="truncate">{displayUrl(current.url)}</span>
        <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" />
      </a>

      {/* GET + POST pills */}
      <div className="flex gap-1.5 flex-wrap">
        <CheckStatusPill type="availability" status={current.last_status === "up" ? "up" : current.last_status} />
        <CheckStatusPill type="login" status={current.last_login_status} />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
        <span>{current.last_response_ms != null ? `${current.last_response_ms}ms` : "—"}</span>
        <span className="capitalize">{current.interval}</span>
        {current.enabled === 0 && <span className="text-yellow-400">OFF</span>}
      </div>

      {/* Actions */}
      <div className="flex gap-1">
        <Button variant="outline" size="sm" className="h-6 flex-1 p-0" onClick={check} disabled={checking}>
          {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        </Button>
        <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={toggle} disabled={toggling}>
          {toggling ? <Loader2 className="h-3 w-3 animate-spin" /> : (
            <Power className={cn("h-3 w-3", current.enabled ? "text-green-400" : "text-muted-foreground")} />
          )}
        </Button>
        <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => onDelete(current.id)}>
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

// ─── LIST VIEW ────────────────────────────────────────────────────────

export const APP_LIST_COLS = "minmax(9rem,2fr) 5.5rem 5rem 5rem 7rem 6rem 10rem 6rem";

export function AppListHeader() {
  return (
    <div
      className="hidden md:grid items-center text-xs font-medium text-muted-foreground px-4 py-1.5 gap-3"
      style={{ gridTemplateColumns: APP_LIST_COLS }}
    >
      <span>App / URL</span>
      <span>Status</span>
      <span>GET</span>
      <span>POST</span>
      <span>Response</span>
      <span>Interval</span>
      <span>Last check</span>
      <span />
    </div>
  );
}

export function AppListRow({ monitor, onDelete, onCheckNow, onToggleEnabled, onEditRequest }: { monitor: SafeMonitor } & AppMonitorActions) {
  const { t } = useI18n();
  const [checking, setChecking] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [current, setCurrent] = useState(monitor);

  const check = async () => {
    setChecking(true);
    try {
      const res = await onCheckNow(current.id);
      if (res) {
        setCurrent((m) => ({
          ...m,
          last_status: res.status as "up" | "down",
          last_login_status: res.login.status as "up" | "down",
          last_response_ms: res.availability.response_ms,
          last_check: res.availability.checked_at,
        }));
      }
    } finally { setChecking(false); }
  };

  const toggle = async () => {
    setToggling(true);
    const next = current.enabled === 0;
    try {
      await onToggleEnabled(current.id, next);
      setCurrent((m) => ({ ...m, enabled: next ? 1 : 0 }));
    } finally { setToggling(false); }
  };

  const leftBorder =
    current.last_status === "up"   ? "border-l-green-500"
    : current.last_status === "down" ? "border-l-red-500"
    : "border-l-border";

  return (
    <div
      className={cn("grid items-center gap-3 px-4 py-3 rounded-lg border bg-card border-l-4", leftBorder, current.enabled === 0 && "opacity-60")}
      style={{ gridTemplateColumns: APP_LIST_COLS }}
    >
      {/* Name + URL */}
      <div className="flex items-center gap-2 min-w-0">
        <StatusDot status={current.last_status} />
        <div className="min-w-0">
          <p className="font-semibold text-xs truncate">{current.name}</p>
          <a href={current.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground font-mono truncate"
          >
            <span className="truncate">{displayUrl(current.url)}</span>
            <ExternalLink className="h-2 w-2 flex-shrink-0" />
          </a>
        </div>
      </div>

      {/* Overall status */}
      <div><OverallBadge status={current.last_status} /></div>

      {/* GET */}
      <div><CheckStatusPill type="availability" status={current.last_status === "up" ? "up" : current.last_status} /></div>

      {/* POST / Login */}
      <div><CheckStatusPill type="login" status={current.last_login_status} /></div>

      {/* Response ms */}
      <div className="text-xs font-mono text-muted-foreground">
        {current.last_response_ms != null ? `${current.last_response_ms}ms` : "—"}
      </div>

      {/* Interval */}
      <div className="text-xs text-muted-foreground capitalize">{current.interval}</div>

      {/* Last check */}
      <div className="text-xs text-muted-foreground whitespace-nowrap">
        {current.last_check ? new Date(current.last_check).toLocaleString() : t("ssl.neverChecked")}
      </div>

      {/* Actions */}
      <div className="flex gap-1 justify-end">
        <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => onEditRequest(current.id)}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={toggle} disabled={toggling}
          title={current.enabled ? t("monitors.disable") : t("monitors.enable")}>
          {toggling ? <Loader2 className="h-3 w-3 animate-spin" /> : (
            <Power className={cn("h-3 w-3", current.enabled ? "text-green-400" : "text-muted-foreground")} />
          )}
        </Button>
        <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={check} disabled={checking}>
          {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        </Button>
        <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => onDelete(current.id)}>
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

// ─── TABLE VIEW ───────────────────────────────────────────────────────

type SortKey = "name" | "status" | "login" | "response_ms" | "last_check" | "interval";

export function AppMonitorTable({ monitors, onDelete, onCheckNow, onToggleEnabled, onEditRequest }: {
  monitors: SafeMonitor[];
} & AppMonitorActions) {
  const { t } = useI18n();
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const [checking, setChecking] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<Record<string, {
    status: "up" | "down" | null;
    login: "up" | "down" | null;
    response_ms: number | null;
    last_check: string | null;
    enabled: number;
  }>>({});

  const getData = (m: SafeMonitor) => {
    const live = liveData[m.id];
    return {
      status: live?.status ?? m.last_status,
      login: live?.login ?? m.last_login_status,
      response_ms: live?.response_ms ?? m.last_response_ms,
      last_check: live?.last_check ?? m.last_check,
      enabled: live?.enabled ?? m.enabled,
    };
  };

  const check = async (m: SafeMonitor) => {
    setChecking(m.id);
    try {
      const res = await onCheckNow(m.id);
      if (res) {
        setLiveData((prev) => ({
          ...prev,
          [m.id]: {
            status: res.status as "up" | "down",
            login: res.login.status as "up" | "down",
            response_ms: res.availability.response_ms,
            last_check: res.availability.checked_at,
            enabled: prev[m.id]?.enabled ?? m.enabled,
          },
        }));
      }
    } finally { setChecking(null); }
  };

  const toggle = async (m: SafeMonitor) => {
    setToggling(m.id);
    const current = liveData[m.id]?.enabled ?? m.enabled;
    const next = current === 0 ? 1 : 0;
    try {
      await onToggleEnabled(m.id, next === 1);
      setLiveData((prev) => ({
        ...prev,
        [m.id]: { ...prev[m.id], enabled: next, status: prev[m.id]?.status ?? m.last_status, login: prev[m.id]?.login ?? m.last_login_status, response_ms: prev[m.id]?.response_ms ?? m.last_response_ms, last_check: prev[m.id]?.last_check ?? m.last_check },
      }));
    } finally { setToggling(null); }
  };

  const toggleSort = (key: SortKey) => {
    setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
  };

  const sorted = [...monitors].sort((a, b) => {
    const da = getData(a);
    const db = getData(b);
    let cmp = 0;
    switch (sort.key) {
      case "name":        cmp = a.name.localeCompare(b.name); break;
      case "status":      cmp = (da.status ?? "").localeCompare(db.status ?? ""); break;
      case "login":       cmp = (da.login ?? "").localeCompare(db.login ?? ""); break;
      case "response_ms": cmp = (da.response_ms ?? 9999) - (db.response_ms ?? 9999); break;
      case "last_check":  cmp = (da.last_check ?? "").localeCompare(db.last_check ?? ""); break;
      case "interval":    cmp = a.interval.localeCompare(b.interval); break;
    }
    return sort.dir === "asc" ? cmp : -cmp;
  });

  const SortIcon = ({ k }: { k: SortKey }) => (
    sort.key === k
      ? sort.dir === "asc"
        ? <ChevronUp className="h-3 w-3 inline ml-0.5" />
        : <ChevronDown className="h-3 w-3 inline ml-0.5" />
      : <ArrowUpDown className="h-3 w-3 inline ml-0.5 opacity-30" />
  );

  const Th = ({ label, k, className }: { label: string; k: SortKey; className?: string }) => (
    <th
      className={cn("px-3 py-2 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap", className)}
      onClick={() => toggleSort(k)}
    >
      {label}<SortIcon k={k} />
    </th>
  );

  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 border-b border-border/60">
          <tr>
            <Th label="App / URL" k="name" />
            <Th label="Status" k="status" className="w-24" />
            <Th label="GET" k="status" className="w-20" />
            <Th label="POST" k="login" className="w-20" />
            <Th label="Response" k="response_ms" className="w-24" />
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-24">User</th>
            <Th label="Last check" k="last_check" className="w-36" />
            <Th label="Interval" k="interval" className="w-20" />
            <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-28"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {sorted.map((monitor) => {
            const { status, login, response_ms, last_check, enabled } = getData(monitor);
            const isChecking = checking === monitor.id;
            const isToggling = toggling === monitor.id;
            const StatusIcon = status === "up" ? CheckCircle : status === "down" ? XCircle : Activity;
            const iconColor = status === "up" ? "text-green-400" : status === "down" ? "text-red-400" : "text-muted-foreground";
            const rowColor =
              status === "up"   ? "hover:bg-green-500/5"
              : status === "down" ? "hover:bg-red-500/5"
              : "hover:bg-muted/20";

            return (
              <tr key={monitor.id} className={cn("transition-colors", rowColor, enabled === 0 && "opacity-60")}>
                {/* Name + URL */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={cn("h-3.5 w-3.5 flex-shrink-0", iconColor)} />
                    <div className="min-w-0">
                      <p className="font-semibold text-xs truncate">{monitor.name}</p>
                      <a href={monitor.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground font-mono truncate"
                      >
                        <span className="truncate max-w-[14rem]">{displayUrl(monitor.url)}</span>
                        <ExternalLink className="h-2 w-2 flex-shrink-0" />
                      </a>
                    </div>
                  </div>
                </td>

                {/* Overall */}
                <td className="px-3 py-2.5"><OverallBadge status={status} /></td>

                {/* GET */}
                <td className="px-3 py-2.5">
                  <CheckStatusPill type="availability" status={status === "up" ? "up" : status} />
                </td>

                {/* POST */}
                <td className="px-3 py-2.5">
                  <CheckStatusPill type="login" status={login} />
                </td>

                {/* Response ms */}
                <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">
                  {response_ms != null ? `${response_ms}ms` : "—"}
                </td>

                {/* Username */}
                <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">
                  {monitor.username}
                </td>

                {/* Last check */}
                <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {last_check ? new Date(last_check).toLocaleString() : t("ssl.neverChecked")}
                </td>

                {/* Interval */}
                <td className="px-3 py-2.5 text-xs text-muted-foreground capitalize">
                  {monitor.interval}
                </td>

                {/* Actions */}
                <td className="px-3 py-2.5">
                  <div className="flex justify-end gap-1">
                    <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => onEditRequest(monitor.id)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => toggle(monitor)} disabled={isToggling}
                      title={enabled ? t("monitors.disable") : t("monitors.enable")}>
                      {isToggling ? <Loader2 className="h-3 w-3 animate-spin" /> : (
                        <Power className={cn("h-3 w-3", enabled ? "text-green-400" : "text-muted-foreground")} />
                      )}
                    </Button>
                    <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => check(monitor)} disabled={isChecking}>
                      {isChecking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    </Button>
                    <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => onDelete(monitor.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
