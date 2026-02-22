"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Loader2, Key, Bell, Mail, Send, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationsManager } from "@/components/notifications-manager";
import { Separator } from "@/components/ui/separator";

interface SettingEntry {
  key: string;
  set: boolean;
  value?: string;
  updated_at: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingEntry[]>([]);
  const [vtKey, setVtKey] = useState("");
  const [shodanKey, setShodanKey] = useState("");
  const [apiSaving, setApiSaving] = useState(false);
  const [apiSaved, setApiSaved] = useState(false);

  // SMTP state
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpSaved, setSmtpSaved] = useState(false);

  // Test email
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);

  const loadSettings = useCallback(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: SettingEntry[]) => {
        setSettings(data);
        // Pre-fill non-secret SMTP fields
        const get = (key: string) => data.find((s) => s.key === key)?.value ?? "";
        setSmtpHost(get("smtp_host"));
        setSmtpPort(get("smtp_port") || "587");
        setSmtpUser(get("smtp_user"));
        setSmtpFrom(get("smtp_from"));
        setSmtpSecure(get("smtp_secure") === "true");
      })
      .catch(() => {});
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const isVtSet = settings.find((s) => s.key === "virustotal_api_key")?.set ?? false;
  const isShodanSet = settings.find((s) => s.key === "shodan_api_key")?.set ?? false;
  const isSmtpSet = settings.find((s) => s.key === "smtp_host")?.set ?? false;

  const handleSaveApiKeys = async () => {
    setApiSaving(true);
    setApiSaved(false);
    const updates: Record<string, string> = {};
    if (vtKey.trim()) updates.virustotal_api_key = vtKey.trim();
    if (shodanKey.trim()) updates.shodan_api_key = shodanKey.trim();
    if (Object.keys(updates).length === 0) { setApiSaving(false); return; }
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      setVtKey(""); setShodanKey("");
      setApiSaved(true);
      setTimeout(() => setApiSaved(false), 3000);
      loadSettings();
    } finally {
      setApiSaving(false);
    }
  };

  const handleSaveSmtp = async () => {
    setSmtpSaving(true);
    setSmtpSaved(false);
    const updates: Record<string, string> = {
      smtp_host: smtpHost.trim(),
      smtp_port: smtpPort.trim() || "587",
      smtp_user: smtpUser.trim(),
      smtp_from: smtpFrom.trim(),
      smtp_secure: smtpSecure ? "true" : "false",
    };
    if (smtpPass.trim()) updates.smtp_pass = smtpPass.trim();
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      setSmtpPass("");
      setSmtpSaved(true);
      setTimeout(() => setSmtpSaved(false), 3000);
      loadSettings();
    } finally {
      setSmtpSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testTo) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo }),
      });
      const data = await res.json();
      setTestResult(data);
      setTimeout(() => setTestResult(null), 8000);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Configure API integrations, SMTP email, and notification webhooks.
      </p>

      {/* API Keys Section */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Key className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">API Keys</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Add API keys to enable automatic enrichment after each scan.
        </p>

        <div className="space-y-4 rounded-lg border border-border/60 bg-card p-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-sm font-medium">VirusTotal API Key</label>
              {isVtSet && <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">Configured</span>}
            </div>
            <input
              type="password"
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder={isVtSet ? "••••••••••••••••" : "Enter your VirusTotal API key"}
              value={vtKey}
              onChange={(e) => setVtKey(e.target.value)}
              autoComplete="off"
            />
          </div>
          <Separator />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-sm font-medium">Shodan API Key</label>
              {isShodanSet && <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">Configured</span>}
            </div>
            <input
              type="password"
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder={isShodanSet ? "••••••••••••••••" : "Enter your Shodan API key"}
              value={shodanKey}
              onChange={(e) => setShodanKey(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button size="sm" onClick={handleSaveApiKeys} disabled={apiSaving || (!vtKey && !shodanKey)}>
              {apiSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Save API Keys
            </Button>
            {apiSaved && <span className="text-sm text-green-400">Saved!</span>}
          </div>
        </div>
      </section>

      <Separator className="mb-8" />

      {/* SMTP Email Section */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Email (SMTP)</h2>
          {isSmtpSet && <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">Configured</span>}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Configure SMTP to receive SSL certificate alert emails.
        </p>

        <div className="space-y-4 rounded-lg border border-border/60 bg-card p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">SMTP Host</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="smtp.gmail.com"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Port</label>
              <input
                type="number"
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="587"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Username</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="user@gmail.com"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Password {settings.find((s) => s.key === "smtp_pass")?.set && <span className="text-green-400">(set)</span>}
              </label>
              <input
                type="password"
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Leave blank to keep existing"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">From Address</label>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="TupiSec <alerts@example.com>"
              value={smtpFrom}
              onChange={(e) => setSmtpFrom(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={smtpSecure}
              onChange={(e) => setSmtpSecure(e.target.checked)}
              className="rounded"
            />
            Use SSL/TLS (port 465)
          </label>

          <div className="flex items-center gap-3 pt-2">
            <Button size="sm" onClick={handleSaveSmtp} disabled={smtpSaving || !smtpHost}>
              {smtpSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Save SMTP
            </Button>
            {smtpSaved && <span className="text-sm text-green-400">Saved!</span>}
          </div>

          {/* Test email */}
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground mb-2">Send a test email to verify your SMTP configuration:</p>
            <div className="flex gap-2">
              <input
                type="email"
                className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="recipient@example.com"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
              />
              <Button size="sm" variant="outline" onClick={handleTestEmail} disabled={testing || !testTo || !isSmtpSet}>
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            {testResult && (
              <div className={`flex items-center gap-2 mt-2 text-sm ${testResult.ok ? "text-green-400" : "text-red-400"}`}>
                {testResult.ok ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {testResult.ok ? "Test email sent successfully!" : `Failed: ${testResult.error}`}
              </div>
            )}
          </div>
        </div>
      </section>

      <Separator className="mb-8" />

      {/* Notifications Section */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Notifications</h2>
        </div>
        <NotificationsManager />
      </section>
    </div>
  );
}
