"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity, Plus, Loader2,
  LayoutGrid, LayoutList, List, Table2,
  Save, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AppMonitorCard } from "@/components/app-monitor-card";
import { AppCompactCard, AppListRow, AppListHeader, AppMonitorTable } from "@/components/app-monitor-views";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import type { AppMonitorRecord, AppCheckResult, AppMonitorInterval } from "@/lib/types";

type SafeMonitor = Omit<AppMonitorRecord, "password_enc">;
type ViewMode = "grid" | "compact" | "list" | "table";

const VIEW_STORAGE_KEY = "app-monitor-view";

const INTERVAL_OPTIONS: { value: AppMonitorInterval; label: string }[] = [
  { value: "5min",  label: "5 min" },
  { value: "15min", label: "15 min" },
  { value: "30min", label: "30 min" },
  { value: "1h",    label: "1 hour" },
  { value: "6h",    label: "6 hours" },
  { value: "1d",    label: "Daily" },
];

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

// ─── Edit Modal (for list/table views) ───────────────────────────────

function EditModal({
  monitor,
  onSave,
  onClose,
}: {
  monitor: SafeMonitor;
  onSave: (fields: {
    name?: string; url?: string; username?: string; password?: string;
    interval?: AppMonitorInterval; notify_email?: string | null; enabled?: number;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: monitor.name,
    url: monitor.url,
    username: monitor.username,
    password: "",
    interval: monitor.interval,
    notify_email: monitor.notify_email ?? "",
    enabled: monitor.enabled === 1,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const fields: Parameters<typeof onSave>[0] = {
        name: form.name,
        url: form.url,
        username: form.username,
        interval: form.interval,
        notify_email: form.notify_email || null,
        enabled: form.enabled ? 1 : 0,
      };
      if (form.password) fields.password = form.password;
      await onSave(fields);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">{monitor.name}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">{t("monitors.name")}</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">{t("monitors.url")}</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("monitors.username")}</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                {t("monitors.password")} <span className="opacity-50">(vacío = no cambiar)</span>
              </label>
              <input
                type="password"
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("monitors.interval")}</label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.interval}
                onChange={(e) => setForm((f) => ({ ...f, interval: e.target.value as AppMonitorInterval }))}
              >
                {INTERVAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("monitors.alertEmail")}</label>
              <input
                type="email"
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="you@example.com"
                value={form.notify_email}
                onChange={(e) => setForm((f) => ({ ...f, notify_email: e.target.value }))}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="rounded"
            />
            <span className="text-muted-foreground">{t("ssl.edit.enabled")}</span>
          </label>
          <Separator />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving || !form.name || !form.url}>
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

// ─── Page ─────────────────────────────────────────────────────────────

export default function MonitorsPage() {
  const { t } = useI18n();
  const [monitors, setMonitors] = useState<SafeMonitor[]>([]);
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
    name: "",
    url: "",
    username: "",
    password: "",
    interval: "15min" as AppMonitorInterval,
    notify_email: "",
  });

  const load = useCallback(() => {
    fetch("/api/app-monitors")
      .then((r) => r.json())
      .then((data) => { setMonitors(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.url || !form.username || !form.password) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/app-monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, notify_email: form.notify_email || null }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ name: "", url: "", username: "", password: "", interval: "15min", notify_email: "" });
        load();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/app-monitors/${id}`, { method: "DELETE" });
    load();
  };

  const handleCheckNow = async (id: string): Promise<{ status: string; availability: AppCheckResult; login: AppCheckResult } | null> => {
    const res = await fetch(`/api/app-monitors/${id}/check`, { method: "POST" });
    if (res.ok) {
      load();
      return res.json();
    }
    return null;
  };

  const handleToggleEnabled = async (id: string, enabled: boolean): Promise<void> => {
    await fetch(`/api/app-monitors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: enabled ? 1 : 0 }),
    });
    load();
  };

  const handleUpdate = async (
    id: string,
    fields: {
      name?: string;
      url?: string;
      username?: string;
      password?: string;
      interval?: AppMonitorInterval;
      notify_email?: string | null;
      enabled?: number;
    }
  ): Promise<SafeMonitor | null> => {
    const res = await fetch(`/api/app-monitors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (res.ok) {
      const updated = await res.json() as SafeMonitor;
      setMonitors((prev) => prev.map((m) => (m.id === id ? updated : m)));
      return updated;
    }
    return null;
  };

  const editingMonitor = editingId ? monitors.find((m) => m.id === editingId) : null;

  const total = monitors.length;
  const up = monitors.filter((m) => m.last_status === "up").length;
  const down = monitors.filter((m) => m.last_status === "down").length;
  const unchecked = monitors.filter((m) => !m.last_status).length;

  return (
    <div className={cn("mx-auto px-4 py-8", viewMode === "table" ? "max-w-7xl" : "max-w-5xl")}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">{t("monitors.title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t("monitors.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ViewSwitcher view={viewMode} onChange={handleViewChange} />
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t("monitors.addMonitor")}
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      {total > 0 && (
        <div className="flex items-center gap-4 mb-6 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{total} {total === 1 ? "monitor" : "monitors"}</span>
          {up > 0 && <span className="text-green-400">● {up} {t("monitors.status.up")}</span>}
          {down > 0 && <span className="text-red-400">● {down} {t("monitors.status.down")}</span>}
          {unchecked > 0 && <span>○ {unchecked} {t("ssl.notChecked")}</span>}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 rounded-lg border border-border/60 bg-card p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("monitors.name")}</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="APEX Ventas"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("monitors.url")}</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="https://app.example.com/login"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("monitors.username")}</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="admin"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("monitors.password")}</label>
              <input
                type="password"
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("monitors.interval")}</label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.interval}
                onChange={(e) => setForm((f) => ({ ...f, interval: e.target.value as AppMonitorInterval }))}
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
                value={form.notify_email}
                onChange={(e) => setForm((f) => ({ ...f, notify_email: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {t("monitors.addMonitor")}
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
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("ssl.loading")}
        </div>
      ) : monitors.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Activity className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">{t("monitors.none")}</p>
          <p className="text-xs mt-1">
            Click &ldquo;{t("monitors.addMonitor")}&rdquo; to start monitoring an app.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {monitors.map((monitor) => (
            <AppMonitorCard
              key={monitor.id}
              monitor={monitor}
              onDelete={handleDelete}
              onCheckNow={handleCheckNow}
              onToggleEnabled={handleToggleEnabled}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      ) : viewMode === "compact" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {monitors.map((monitor) => (
            <AppCompactCard
              key={monitor.id}
              monitor={monitor}
              onDelete={handleDelete}
              onCheckNow={handleCheckNow}
              onToggleEnabled={handleToggleEnabled}
            />
          ))}
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-1">
          <AppListHeader />
          {monitors.map((monitor) => (
            <AppListRow
              key={monitor.id}
              monitor={monitor}
              onDelete={handleDelete}
              onCheckNow={handleCheckNow}
              onToggleEnabled={handleToggleEnabled}
              onEditRequest={setEditingId}
            />
          ))}
        </div>
      ) : (
        <AppMonitorTable
          monitors={monitors}
          onDelete={handleDelete}
          onCheckNow={handleCheckNow}
          onToggleEnabled={handleToggleEnabled}
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
