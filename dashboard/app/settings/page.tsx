"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Key, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationsManager } from "@/components/notifications-manager";
import { Separator } from "@/components/ui/separator";

interface ApiKeyStatus {
  key: string;
  set: boolean;
  updated_at: string;
}

export default function SettingsPage() {
  const [keyStatuses, setKeyStatuses] = useState<ApiKeyStatus[]>([]);
  const [vtKey, setVtKey] = useState("");
  const [shodanKey, setShodanKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: ApiKeyStatus[]) => setKeyStatuses(data))
      .catch(() => {});
  }, []);

  const isVtSet = keyStatuses.find((k) => k.key === "virustotal_api_key")?.set ?? false;
  const isShodanSet = keyStatuses.find((k) => k.key === "shodan_api_key")?.set ?? false;

  const handleSaveKeys = async () => {
    setSaving(true);
    setSaved(false);
    const updates: Record<string, string> = {};
    if (vtKey.trim()) updates.virustotal_api_key = vtKey.trim();
    if (shodanKey.trim()) updates.shodan_api_key = shodanKey.trim();
    if (Object.keys(updates).length === 0) {
      setSaving(false);
      return;
    }
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      // Refresh statuses
      const res = await fetch("/api/settings");
      const data = await res.json();
      setKeyStatuses(data);
      setVtKey("");
      setShodanKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Configure API integrations and notification webhooks.
      </p>

      {/* API Keys Section */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Key className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">API Keys</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Add API keys to enable automatic enrichment after each scan. Keys are stored locally and never sent to third parties.
        </p>

        <div className="space-y-4 rounded-lg border border-border/60 bg-card p-4">
          {/* VirusTotal */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-sm font-medium">VirusTotal API Key</label>
              {isVtSet && (
                <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">Configured</span>
              )}
            </div>
            <input
              type="password"
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder={isVtSet ? "••••••••••••••••••••••••••••••••" : "Enter your VirusTotal API key"}
              value={vtKey}
              onChange={(e) => setVtKey(e.target.value)}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Get a free key at{" "}
              <span className="text-primary">virustotal.com</span>
            </p>
          </div>

          <Separator />

          {/* Shodan */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-sm font-medium">Shodan API Key</label>
              {isShodanSet && (
                <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">Configured</span>
              )}
            </div>
            <input
              type="password"
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder={isShodanSet ? "••••••••••••••••••••••••••••••••" : "Enter your Shodan API key"}
              value={shodanKey}
              onChange={(e) => setShodanKey(e.target.value)}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Get a key at{" "}
              <span className="text-primary">shodan.io</span>
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button size="sm" onClick={handleSaveKeys} disabled={saving || (!vtKey && !shodanKey)}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              Save API Keys
            </Button>
            {saved && <span className="text-sm text-green-400">Saved!</span>}
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
