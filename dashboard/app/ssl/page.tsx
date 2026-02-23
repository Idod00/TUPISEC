"use client";

import { useState, useEffect, useCallback } from "react";
import { LockKeyhole, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SSLMonitorCard } from "@/components/ssl-monitor-card";
import { useI18n } from "@/lib/i18n/context";
import type { SSLMonitorRecord, SSLCheckResult } from "@/lib/types";


export default function SSLPage() {
  const { t } = useI18n();
  const [monitors, setMonitors] = useState<SSLMonitorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
        body: JSON.stringify({
          ...form,
          notify_email: form.notify_email || null,
        }),
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
    if (res.ok) return res.json();
    return null;
  };

  const handleCheckNow = async (id: string): Promise<{ status: string; result: SSLCheckResult } | null> => {
    const res = await fetch(`/api/ssl-monitors/${id}/check`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      // Refresh list to update last_status in DB
      load();
      return data;
    }
    return null;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LockKeyhole className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">{t("ssl.title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t("ssl.subtitle")}</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1.5" />
          {t("ssl.addMonitor")}
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="mb-6 rounded-lg border border-border/60 bg-card p-4"
        >
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
              <input
                type="number"
                min={1}
                max={65535}
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
              <input
                type="number"
                min={1}
                max={365}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.notify_days_before}
                onChange={(e) => setForm((f) => ({ ...f, notify_days_before: parseInt(e.target.value) || 14 }))}
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-muted-foreground mb-1">{t("ssl.alertEmail")}</label>
            <input
              type="email"
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
              {t("common.delete") === "Delete" ? "Cancel" : "Cancelar"}
            </Button>
          </div>
        </form>
      )}

      {/* Monitor list */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading monitors...
        </div>
      ) : monitors.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <LockKeyhole className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">{t("ssl.none")}</p>
          <p className="text-xs mt-1">Click &ldquo;{t("ssl.addMonitor")}&rdquo; to start monitoring a domain.</p>
        </div>
      ) : (
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
      )}
    </div>
  );
}
