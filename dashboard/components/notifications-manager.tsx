"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Send, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NotificationConfig } from "@/lib/types";

interface TestResult {
  configId: string;
  ok: boolean;
  error?: string;
}

export function NotificationsManager() {
  const [configs, setConfigs] = useState<NotificationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [testResults, setTestResults] = useState<Map<string, TestResult>>(new Map());
  const [testing, setTesting] = useState<Set<string>>(new Set());

  const [form, setForm] = useState({
    name: "",
    type: "webhook" as "slack" | "webhook",
    url: "",
    notify_on_complete: true,
    notify_on_critical: true,
    min_risk_score: 100,
  });
  const [saving, setSaving] = useState(false);

  const loadConfigs = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => { setConfigs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.url) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ name: "", type: "webhook", url: "", notify_on_complete: true, notify_on_critical: true, min_risk_score: 100 });
        loadConfigs();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    if (res.ok) loadConfigs();
  };

  const handleTest = async (id: string) => {
    setTesting((prev) => new Set(prev).add(id));
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      setTestResults((prev) => new Map(prev).set(id, { configId: id, ok: data.ok, error: data.error }));
    } catch (err) {
      setTestResults((prev) => new Map(prev).set(id, { configId: id, ok: false, error: String(err) }));
    } finally {
      setTesting((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Webhook Notifications</h2>
          <p className="text-sm text-muted-foreground">
            Receive alerts when scans complete or critical findings are detected.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Webhook
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-border/60 bg-card p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Name</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="My Slack channel"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Type</label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "slack" | "webhook" }))}
              >
                <option value="slack">Slack (Incoming Webhook)</option>
                <option value="webhook">Generic Webhook</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-muted-foreground mb-1">Webhook URL</label>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="https://hooks.slack.com/services/..."
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.notify_on_complete}
                onChange={(e) => setForm((f) => ({ ...f, notify_on_complete: e.target.checked }))}
                className="rounded"
              />
              On scan complete
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.notify_on_critical}
                onChange={(e) => setForm((f) => ({ ...f, notify_on_critical: e.target.checked }))}
                className="rounded"
              />
              On critical finding
            </label>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Min Risk Score Threshold</label>
              <input
                type="number"
                min={0}
                max={100}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.min_risk_score}
                onChange={(e) => setForm((f) => ({ ...f, min_risk_score: parseInt(e.target.value) || 100 }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Save
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Config list */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </div>
      ) : configs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          No webhooks configured yet. Add one to start receiving notifications.
        </p>
      ) : (
        <div className="space-y-2">
          {configs.map((config) => {
            const testResult = testResults.get(config.id);
            const isTesting = testing.has(config.id);
            return (
              <div
                key={config.id}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{config.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      config.type === "slack" ? "bg-yellow-500/10 text-yellow-400" : "bg-blue-500/10 text-blue-400"
                    }`}>
                      {config.type}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      config.enabled ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground"
                    }`}>
                      {config.enabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{config.url}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    {config.notify_on_complete ? <span>On complete</span> : null}
                    {config.notify_on_critical ? <span>On critical</span> : null}
                    <span>Score ≤ {config.min_risk_score}</span>
                  </div>
                </div>

                {testResult && (
                  <div className="flex items-center gap-1 text-xs">
                    {testResult.ok ? (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                    <span className={testResult.ok ? "text-green-400" : "text-red-400"}>
                      {testResult.ok ? "Sent" : "Failed"}
                    </span>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTest(config.id)}
                  disabled={isTesting}
                  title="Send test notification"
                >
                  {isTesting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(config.id)}
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
