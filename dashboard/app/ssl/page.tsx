"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LockKeyhole, Plus, Loader2,
  LayoutGrid, LayoutList, List, Table2,
  Save, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SSLMonitorCard } from "@/components/ssl-monitor-card";
import { CompactCard, ListRow, MonitorTable } from "@/components/ssl-monitor-views";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import type { SSLMonitorRecord, SSLCheckResult } from "@/lib/types";

type ViewMode = "grid" | "compact" | "list" | "table";

const VIEW_STORAGE_KEY = "ssl-monitor-view";

// ─── Edit Modal (for list/table views) ───────────────────────────────

function EditModal({
  monitor,
  onSave,
  onClose,
}: {
  monitor: SSLMonitorRecord;
  onSave: (fields: Partial<SSLMonitorRecord>) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    domain: monitor.domain,
    port: monitor.port,
    interval: monitor.interval as "daily" | "weekly" | "monthly",
    notify_days_before: monitor.notify_days_before,
    notify_email: monitor.notify_email ?? "",
    enabled: monitor.enabled === 1,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        domain: form.domain,
        port: form.port,
        interval: form.interval,
        notify_days_before: form.notify_days_before,
        notify_email: form.notify_email || null,
        enabled: form.enabled ? 1 : 0,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">{monitor.domain}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">{t("ssl.domain")}</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.domain}
                onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("ssl.port")}</label>
              <input type="number" min={1} max={65535}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.port}
                onChange={(e) => setForm((f) => ({ ...f, port: parseInt(e.target.value) || 443 }))}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("schedules.interval")}</label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.interval}
                onChange={(e) => setForm((f) => ({ ...f, interval: e.target.value as "daily" | "weekly" | "monthly" }))}
              >
                <option value="daily">{t("schedules.daily")}</option>
                <option value="weekly">{t("schedules.weekly")}</option>
                <option value="monthly">{t("schedules.monthly")}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("ssl.alertDays")}</label>
              <input type="number" min={1} max={365}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.notify_days_before}
                onChange={(e) => setForm((f) => ({ ...f, notify_days_before: parseInt(e.target.value) || 14 }))}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("ssl.alertEmail")}</label>
              <input type="email"
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="you@example.com"
                value={form.notify_email}
                onChange={(e) => setForm((f) => ({ ...f, notify_email: e.target.value }))}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="rounded"
            />
            <span className="text-muted-foreground">{t("ssl.edit.enabled")}</span>
          </label>
          <Separator />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving || !form.domain}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              {t("common.save")}
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}>
              <X className="h-3.5 w-3.5 mr-1" />
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── View Switcher ────────────────────────────────────────────────────

function ViewSwitcher({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  const { t } = useI18n();
  const options: { mode: ViewMode; Icon: React.ElementType; label: string }[] = [
    { mode: "grid",    Icon: LayoutGrid, label: t("ssl.view.grid") },
    { mode: "compact", Icon: LayoutList, label: t("ssl.view.compact") },
    { mode: "list",    Icon: List,       label: t("ssl.view.list") },
    { mode: "table",   Icon: Table2,     label: t("ssl.view.table") },
  ];
  return (
    <div className="flex items-center rounded-md border border-border/60 overflow-hidden">
      {options.map(({ mode, Icon, label }) => (
        <button
          key={mode}
          title={label}
          onClick={() => onChange(mode)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors",
            view === mode
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

export default function SSLPage() {
  const { t } = useI18n();
  const [monitors, setMonitors] = useState<SSLMonitorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Persist view mode
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode | null;
    if (saved && ["grid", "compact", "list", "table"].includes(saved)) setViewMode(saved);
  }, []);

  const handleViewChange = (v: ViewMode) => {
    setViewMode(v);
    localStorage.setItem(VIEW_STORAGE_KEY, v);
  };

  const [form, setForm] = useState({
    domain: "",
    port: 443,
    interval: "daily" as "daily" | "weekly" | "monthly",
    notify_days_before: 14,
    notify_email: "",
  });

  const load = useCallback(() => {
    fetch("/api/ssl-monitors")
      .then((r) => r.json())
      .then((data) => { setMonitors(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.domain) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/ssl-monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, notify_email: form.notify_email || null }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ domain: "", port: 443, interval: "daily", notify_days_before: 14, notify_email: "" });
        load();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/ssl-monitors/${id}`, { method: "DELETE" });
    load();
  };

  const handleUpdate = async (id: string, fields: Partial<SSLMonitorRecord>): Promise<SSLMonitorRecord | null> => {
    const res = await fetch(`/api/ssl-monitors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (res.ok) {
      const updated = await res.json();
      setMonitors((prev) => prev.map((m) => (m.id === id ? updated : m)));
      return updated;
    }
    return null;
  };

  const handleCheckNow = async (id: string): Promise<{ status: string; result: SSLCheckResult } | null> => {
    const res = await fetch(`/api/ssl-monitors/${id}/check`, { method: "POST" });
    if (res.ok) {
      load();
      return res.json();
    }
    return null;
  };

  const editingMonitor = editingId ? monitors.find((m) => m.id === editingId) : null;

  // Summary stats
  const total = monitors.length;
  const ok = monitors.filter((m) => m.last_status === "ok").length;
  const warning = monitors.filter((m) => m.last_status === "warning").length;
  const error = monitors.filter((m) => m.last_status === "error").length;
  const unchecked = monitors.filter((m) => !m.last_status).length;

  return (
    <div className={cn("mx-auto px-4 py-8", viewMode === "table" ? "max-w-7xl" : "max-w-5xl")}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LockKeyhole className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">{t("ssl.title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t("ssl.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ViewSwitcher view={viewMode} onChange={handleViewChange} />
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t("ssl.addMonitor")}
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      {total > 0 && (
        <div className="flex items-center gap-4 mb-6 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{total} {total === 1 ? "monitor" : "monitors"}</span>
          {ok > 0 && <span className="text-green-400">● {ok} {t("ssl.status.ok")}</span>}
          {warning > 0 && <span className="text-yellow-400">● {warning} {t("ssl.status.warning")}</span>}
          {error > 0 && <span className="text-red-400">● {error} {t("ssl.status.error")}</span>}
          {unchecked > 0 && <span>○ {unchecked} {t("ssl.notChecked")}</span>}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 rounded-lg border border-border/60 bg-card p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("ssl.domain")}</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="example.com"
                value={form.domain}
                onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("ssl.port")}</label>
              <input type="number" min={1} max={65535}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.port}
                onChange={(e) => setForm((f) => ({ ...f, port: parseInt(e.target.value) || 443 }))}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("schedules.interval")}</label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.interval}
                onChange={(e) => setForm((f) => ({ ...f, interval: e.target.value as "daily" | "weekly" | "monthly" }))}
              >
                <option value="daily">{t("schedules.daily")}</option>
                <option value="weekly">{t("schedules.weekly")}</option>
                <option value="monthly">{t("schedules.monthly")}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("ssl.alertDays")}</label>
              <input type="number" min={1} max={365}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.notify_days_before}
                onChange={(e) => setForm((f) => ({ ...f, notify_days_before: parseInt(e.target.value) || 14 }))}
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-muted-foreground mb-1">{t("ssl.alertEmail")}</label>
            <input type="email"
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="you@example.com"
              value={form.notify_email}
              onChange={(e) => setForm((f) => ({ ...f, notify_email: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {t("ssl.addMonitor")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("ssl.loading")}
        </div>
      ) : monitors.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <LockKeyhole className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">{t("ssl.none")}</p>
          <p className="text-xs mt-1">Click &ldquo;{t("ssl.addMonitor")}&rdquo; to start monitoring a domain.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {monitors.map((monitor) => (
            <SSLMonitorCard
              key={monitor.id}
              monitor={monitor}
              onDelete={handleDelete}
              onCheckNow={handleCheckNow}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      ) : viewMode === "compact" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {monitors.map((monitor) => (
            <CompactCard
              key={monitor.id}
              monitor={monitor}
              onDelete={handleDelete}
              onCheckNow={handleCheckNow}
            />
          ))}
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-2">
          {/* List header */}
          <div className="hidden md:grid text-xs text-muted-foreground px-4 gap-4" style={{ gridTemplateColumns: "11rem 5rem 9rem 6rem 1fr 5rem 8rem auto" }}>
            <span>{t("ssl.domain")}</span>
            <span>Status</span>
            <span>{t("ssl.daysRemaining").replace("{n} ", "")}</span>
            <span>{t("ssl.expires")}</span>
            <span>{t("ssl.issuer")}</span>
            <span>{t("ssl.protocol")}</span>
            <span>{t("ssl.nextCheck")}</span>
          </div>
          {monitors.map((monitor) => (
            <ListRow
              key={monitor.id}
              monitor={monitor}
              onDelete={handleDelete}
              onCheckNow={handleCheckNow}
              onUpdate={handleUpdate}
              onEditRequest={setEditingId}
            />
          ))}
        </div>
      ) : (
        <MonitorTable
          monitors={monitors}
          onDelete={handleDelete}
          onCheckNow={handleCheckNow}
          onUpdate={handleUpdate}
          onEditRequest={setEditingId}
        />
      )}

      {/* Edit Modal for list/table views */}
      {editingMonitor && (
        <EditModal
          monitor={editingMonitor}
          onSave={(fields) => handleUpdate(editingMonitor.id, fields).then(() => {})}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
