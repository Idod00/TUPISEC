"use client";

import { useState } from "react";
import {
  AlertTriangle, CheckCircle, XCircle, LockKeyhole,
  Loader2, RefreshCw, Trash2, Pencil, ChevronUp, ChevronDown,
  Clock, Calendar, ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import type { SSLMonitorRecord, SSLCheckResult } from "@/lib/types";

// ─── Shared helpers ──────────────────────────────────────────────────

export function StatusDot({ status }: { status: string | null }) {
  const color =
    status === "ok" ? "bg-green-400"
    : status === "warning" ? "bg-yellow-400"
    : status === "error" ? "bg-red-400"
    : "bg-muted-foreground/40";
  return <span className={cn("inline-block w-2 h-2 rounded-full flex-shrink-0", color)} />;
}

export function DaysBar({ days }: { days: number | null }) {
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
    <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const { t } = useI18n();
  if (!status) return <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{t("ssl.notChecked")}</span>;
  const map = { ok: "bg-green-500/10 text-green-400", warning: "bg-yellow-500/10 text-yellow-400", error: "bg-red-500/10 text-red-400" };
  const label = status === "ok" ? t("ssl.status.ok") : status === "warning" ? t("ssl.status.warning") : t("ssl.status.error");
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", map[status as keyof typeof map] ?? "bg-muted text-muted-foreground")}>{label}</span>;
}

// ─── Shared check hook ────────────────────────────────────────────────

interface MonitorActions {
  onDelete: (id: string) => void;
  onCheckNow: (id: string) => Promise<{ status: string; result: SSLCheckResult } | null>;
  onUpdate: (id: string, fields: Partial<SSLMonitorRecord>) => Promise<SSLMonitorRecord | null>;
}

// ─── COMPACT VIEW ─────────────────────────────────────────────────────
// Small dense cards – 3 columns, status + days bar + actions only

export function CompactCard({ monitor, onDelete, onCheckNow }: { monitor: SSLMonitorRecord } & Pick<MonitorActions, "onDelete" | "onCheckNow">) {
  const { t } = useI18n();
  const [checking, setChecking] = useState(false);
  const [days, setDays] = useState<number | null>(monitor.last_days_remaining);
  const [status, setStatus] = useState<string | null>(monitor.last_status);

  const check = async () => {
    setChecking(true);
    try {
      const res = await onCheckNow(monitor.id);
      if (res) { setDays(res.result.days_remaining); setStatus(res.status); }
    } finally { setChecking(false); }
  };

  const borderColor =
    status === "ok" ? "border-green-500/40"
    : status === "warning" ? "border-yellow-400/40"
    : status === "error" ? "border-red-500/40"
    : "border-border/60";

  return (
    <div className={cn("rounded-lg border bg-card p-3 flex flex-col gap-2", borderColor)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <StatusDot status={status} />
          <span className="text-xs font-mono font-semibold truncate">{monitor.domain}</span>
        </div>
        <StatusBadge status={status} />
      </div>

      {days !== null && (
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">
            {days < 0
              ? t("ssl.expiredAgo").replace("{n}", String(Math.abs(days)))
              : t("ssl.daysRemaining").replace("{n}", String(days))}
          </p>
          <DaysBar days={days} />
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-border/40">
        <span className="text-xs text-muted-foreground capitalize">{monitor.interval}</span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={check} disabled={checking}>
            {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </Button>
          <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => onDelete(monitor.id)}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── LIST VIEW ────────────────────────────────────────────────────────

// Shared grid template — used by both header and each row for pixel-perfect alignment
export const LIST_COLS = "minmax(9rem,1.5fr) 5.5rem 10rem 6rem minmax(6rem,1fr) 5.5rem 11rem 6rem";

export function ListHeader() {
  const { t } = useI18n();
  return (
    <div
      className="hidden md:grid items-center text-xs font-medium text-muted-foreground px-4 py-1.5 gap-3"
      style={{ gridTemplateColumns: LIST_COLS }}
    >
      <span>{t("ssl.domain")}</span>
      <span>Status</span>
      <span>{t("ssl.daysRemaining").replace("{n} ", "")}</span>
      <span>{t("ssl.expires")}</span>
      <span>{t("ssl.issuer")}</span>
      <span>{t("ssl.protocol")}</span>
      <span>{t("ssl.nextCheck")}</span>
      <span />
    </div>
  );
}

export function ListRow({ monitor, onDelete, onCheckNow, onUpdate, onEditRequest }: { monitor: SSLMonitorRecord; onEditRequest: (id: string) => void } & MonitorActions) {
  const { t } = useI18n();
  const [checking, setChecking] = useState(false);
  const [days, setDays] = useState<number | null>(monitor.last_days_remaining);
  const [status, setStatus] = useState<string | null>(monitor.last_status);
  const initResult = monitor.last_result_json ? JSON.parse(monitor.last_result_json) as SSLCheckResult : null;
  const [result, setResult] = useState<SSLCheckResult | null>(initResult);

  const check = async () => {
    setChecking(true);
    try {
      const res = await onCheckNow(monitor.id);
      if (res) { setDays(res.result.days_remaining); setStatus(res.status); setResult(res.result); }
    } finally { setChecking(false); }
  };

  const leftBorder =
    status === "ok" ? "border-l-green-500"
    : status === "warning" ? "border-l-yellow-400"
    : status === "error" ? "border-l-red-500"
    : "border-l-border";

  return (
    <div
      className={cn("grid items-center gap-3 px-4 py-3 rounded-lg border bg-card border-l-4", leftBorder)}
      style={{ gridTemplateColumns: LIST_COLS }}
    >
      {/* Domain */}
      <div className="flex items-center gap-2 min-w-0">
        <StatusDot status={status} />
        <div className="min-w-0">
          <p className="font-mono font-semibold text-xs truncate">{monitor.domain}</p>
          {monitor.port !== 443 && <p className="text-xs text-muted-foreground">:{monitor.port}</p>}
        </div>
      </div>

      {/* Status badge */}
      <div>
        <StatusBadge status={status} />
      </div>

      {/* Days + bar */}
      <div>
        {days !== null ? (
          <>
            <p className={cn("text-xs mb-0.5", days < 0 ? "text-red-400" : days <= 14 ? "text-orange-400" : "text-muted-foreground")}>
              {days < 0
                ? t("ssl.expiredAgo").replace("{n}", String(Math.abs(days)))
                : t("ssl.daysRemaining").replace("{n}", String(days))}
            </p>
            <DaysBar days={days} />
          </>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {/* Expires */}
      <div className="text-xs text-muted-foreground">
        {result?.valid_to ? new Date(result.valid_to).toLocaleDateString() : "—"}
      </div>

      {/* Issuer */}
      <div className="text-xs text-muted-foreground truncate">
        {result?.issuer?.O ?? result?.issuer?.CN ?? "—"}
      </div>

      {/* Protocol */}
      <div className="text-xs font-mono text-muted-foreground">
        {result?.protocol ?? "—"}
      </div>

      {/* Last check */}
      <div className="text-xs text-muted-foreground">
        {monitor.last_check ? new Date(monitor.last_check).toLocaleString() : t("ssl.neverChecked")}
      </div>

      {/* Actions */}
      <div className="flex gap-1 justify-end">
        <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => onEditRequest(monitor.id)}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={check} disabled={checking}>
          {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        </Button>
        <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => onDelete(monitor.id)}>
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

// ─── TABLE VIEW ───────────────────────────────────────────────────────

type SortKey = "domain" | "status" | "days" | "expires" | "last_check" | "interval";

export function MonitorTable({ monitors, onDelete, onCheckNow, onUpdate, onEditRequest }: {
  monitors: SSLMonitorRecord[];
  onEditRequest: (id: string) => void;
} & MonitorActions) {
  const { t } = useI18n();
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "domain", dir: "asc" });
  const [checking, setChecking] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<Record<string, { status: string | null; days: number | null; result: SSLCheckResult | null }>>({});

  const getMonitorData = (m: SSLMonitorRecord) => {
    const live = liveData[m.id];
    const initResult = m.last_result_json ? JSON.parse(m.last_result_json) as SSLCheckResult : null;
    return {
      status: live?.status ?? m.last_status,
      days: live?.days ?? m.last_days_remaining,
      result: live?.result ?? initResult,
    };
  };

  const check = async (id: string) => {
    setChecking(id);
    try {
      const res = await onCheckNow(id);
      if (res) {
        setLiveData((prev) => ({ ...prev, [id]: { status: res.status, days: res.result.days_remaining, result: res.result } }));
      }
    } finally { setChecking(null); }
  };

  const toggleSort = (key: SortKey) => {
    setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
  };

  const sorted = [...monitors].sort((a, b) => {
    const da = getMonitorData(a);
    const db = getMonitorData(b);
    let cmp = 0;
    switch (sort.key) {
      case "domain": cmp = a.domain.localeCompare(b.domain); break;
      case "status": cmp = (da.status ?? "").localeCompare(db.status ?? ""); break;
      case "days": cmp = (da.days ?? 999) - (db.days ?? 999); break;
      case "expires": cmp = (da.result?.valid_to ?? "").localeCompare(db.result?.valid_to ?? ""); break;
      case "last_check": cmp = (a.last_check ?? "").localeCompare(b.last_check ?? ""); break;
      case "interval": cmp = a.interval.localeCompare(b.interval); break;
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
            <Th label={t("ssl.domain")} k="domain" />
            <Th label={t("ssl.status.ok").replace("OK", "Status")} k="status" className="w-24" />
            <Th label={t("ssl.daysRemaining").replace("{n} ", "")} k="days" className="w-40" />
            <Th label={t("ssl.expires")} k="expires" className="w-28" />
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-32">{t("ssl.issuer")}</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-24">{t("ssl.protocol")}</th>
            <Th label={t("ssl.nextCheck")} k="last_check" className="w-36" />
            <Th label={t("schedules.interval")} k="interval" className="w-24" />
            <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-24"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {sorted.map((monitor) => {
            const { status, days, result } = getMonitorData(monitor);
            const isChecking = checking === monitor.id;
            const rowColor =
              status === "ok" ? "hover:bg-green-500/5"
              : status === "warning" ? "hover:bg-yellow-400/5"
              : status === "error" ? "hover:bg-red-500/5"
              : "hover:bg-muted/20";

            return (
              <tr key={monitor.id} className={cn("transition-colors", rowColor)}>
                {/* Domain */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <StatusDot status={status} />
                    <div>
                      <p className="font-mono text-xs font-semibold">{monitor.domain}</p>
                      {monitor.port !== 443 && <p className="text-xs text-muted-foreground">:{monitor.port}</p>}
                    </div>
                  </div>
                </td>

                {/* Status */}
                <td className="px-3 py-2.5">
                  <StatusBadge status={status} />
                </td>

                {/* Days + bar */}
                <td className="px-3 py-2.5 w-40">
                  {days !== null ? (
                    <div>
                      <p className={cn("text-xs mb-1", days < 0 ? "text-red-400" : days <= 14 ? "text-orange-400" : "text-muted-foreground")}>
                        {days < 0
                          ? t("ssl.expiredAgo").replace("{n}", String(Math.abs(days)))
                          : t("ssl.daysRemaining").replace("{n}", String(days))}
                      </p>
                      <DaysBar days={days} />
                    </div>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>

                {/* Expires */}
                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                  {result?.valid_to ? new Date(result.valid_to).toLocaleDateString() : "—"}
                </td>

                {/* Issuer */}
                <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[8rem] truncate">
                  {result?.issuer?.O ?? result?.issuer?.CN ?? "—"}
                </td>

                {/* Protocol */}
                <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">
                  {result?.protocol ?? "—"}
                </td>

                {/* Last check */}
                <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {monitor.last_check ? new Date(monitor.last_check).toLocaleString() : t("ssl.neverChecked")}
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
                    <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => check(monitor.id)} disabled={isChecking}>
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
