"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Loader2, Key, Bell, Mail, Send, CheckCircle, XCircle, Database, HardDrive, Lock, Trash2, Copy, Users, UserPlus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationsManager } from "@/components/notifications-manager";
import { Separator } from "@/components/ui/separator";

interface SettingEntry {
  key: string;
  set: boolean;
  value?: string;
  updated_at: string;
}

interface BackupEntry {
  filename: string;
  size: number;
  created_at: string;
}

interface ApiTokenEntry {
  id: string;
  name: string;
  token_prefix: string;
  created_at: string;
  last_used: string | null;
}

interface UserEntry {
  id: string;
  username: string;
  role: string;
  created_at: string;
  last_login: string | null;
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

  // Auth state
  const [authEnabled, setAuthEnabled] = useState(false);
  const [authConfigured, setAuthConfigured] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [authSaving, setAuthSaving] = useState(false);
  const [authResult, setAuthResult] = useState<{ ok: boolean; error?: string } | null>(null);

  // Backup state
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [backupRunning, setBackupRunning] = useState(false);
  const [backupResult, setBackupResult] = useState<{ ok: boolean; filename?: string; error?: string } | null>(null);

  // API Tokens state
  const [tokens, setTokens] = useState<ApiTokenEntry[]>([]);
  const [newTokenName, setNewTokenName] = useState("");
  const [creatingToken, setCreatingToken] = useState(false);
  const [newTokenValue, setNewTokenValue] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Current user role (for showing admin-only sections)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // Users management (admin only)
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [newUserName, setNewUserName] = useState("");
  const [newUserPass, setNewUserPass] = useState("");
  const [newUserRole, setNewUserRole] = useState("seguridad");
  const [creatingUser, setCreatingUser] = useState(false);
  const [userError, setUserError] = useState("");

  const loadSettings = useCallback(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: SettingEntry[]) => {
        setSettings(data);
        const get = (key: string) => data.find((s) => s.key === key)?.value ?? "";
        setSmtpHost(get("smtp_host"));
        setSmtpPort(get("smtp_port") || "587");
        setSmtpUser(get("smtp_user"));
        setSmtpFrom(get("smtp_from"));
        setSmtpSecure(get("smtp_secure") === "true");
      })
      .catch(() => {});
  }, []);

  const loadAuthStatus = useCallback(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data) => {
        setAuthEnabled(data.enabled);
        setAuthConfigured(data.configured);
      })
      .catch(() => {});
  }, []);

  const loadBackups = useCallback(() => {
    fetch("/api/backup")
      .then((r) => r.json())
      .then(setBackups)
      .catch(() => {});
  }, []);

  const loadTokens = useCallback(() => {
    fetch("/api/tokens")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTokens(data);
      })
      .catch(() => {});
  }, []);

  const loadCurrentUser = useCallback(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.role) setCurrentUserRole(data.role); })
      .catch(() => {});
  }, []);

  const loadUsers = useCallback(() => {
    fetch("/api/auth/users")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { if (Array.isArray(data)) setUsers(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSettings();
    loadAuthStatus();
    loadBackups();
    loadTokens();
    loadCurrentUser();
  }, [loadSettings, loadAuthStatus, loadBackups, loadTokens, loadCurrentUser]);

  useEffect(() => {
    if (currentUserRole === "admin") loadUsers();
  }, [currentUserRole, loadUsers]);

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      setAuthResult({ ok: false, error: "Passwords don't match" });
      return;
    }
    if (newPass.length < 8) {
      setAuthResult({ ok: false, error: "Password must be at least 8 characters" });
      return;
    }
    setAuthSaving(true);
    setAuthResult(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentPass(""); setNewPass(""); setConfirmPass("");
        setAuthResult({ ok: true });
      } else {
        setAuthResult({ ok: false, error: data.error });
      }
      setTimeout(() => setAuthResult(null), 5000);
    } finally {
      setAuthSaving(false);
    }
  };

  const handleRunBackup = async () => {
    setBackupRunning(true);
    setBackupResult(null);
    try {
      const res = await fetch("/api/backup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setBackupResult({ ok: true, filename: data.filename });
        loadBackups();
      } else {
        setBackupResult({ ok: false, error: data.error });
      }
      setTimeout(() => setBackupResult(null), 6000);
    } finally {
      setBackupRunning(false);
    }
  };

  const handleCreateToken = async () => {
    if (!newTokenName.trim()) return;
    setCreatingToken(true);
    setNewTokenValue(null);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTokenName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewTokenName("");
        setNewTokenValue(data.token);
        loadTokens();
      }
    } finally {
      setCreatingToken(false);
    }
  };

  const handleDeleteToken = async (id: string) => {
    await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    setTokens((prev) => prev.filter((t) => t.id !== id));
  };

  const handleCopyToken = async () => {
    if (!newTokenValue) return;
    try {
      await navigator.clipboard.writeText(newTokenValue);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserPass.trim()) return;
    setCreatingUser(true);
    setUserError("");
    try {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUserName.trim(), password: newUserPass, role: newUserRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewUserName(""); setNewUserPass(""); setNewUserRole("seguridad");
        loadUsers();
      } else {
        setUserError(data.error || "Failed to create user");
      }
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    await fetch(`/api/auth/users/${id}`, { method: "DELETE" });
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const handleChangeUserRole = async (id: string, role: string) => {
    const res = await fetch(`/api/auth/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) loadUsers();
  };

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Configure API integrations, SMTP email, authentication, backups, and notification webhooks.
      </p>

      {/* API Keys Section */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Key className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">API Keys</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Add API keys to enable automatic enrichment after each scan. Keys are stored encrypted.
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

      {/* Password / Authentication Section */}
      {authEnabled && (
        <>
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Authentication</h2>
              {authConfigured && <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">Password set</span>}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Change your dashboard login password.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4 rounded-lg border border-border/60 bg-card p-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Current Password</label>
                <input
                  type="password"
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">New Password</label>
                  <input
                    type="password"
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
              {authResult && (
                <div className={`flex items-center gap-2 text-sm ${authResult.ok ? "text-green-400" : "text-red-400"}`}>
                  {authResult.ok ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {authResult.ok ? "Password changed successfully!" : authResult.error}
                </div>
              )}
              <Button type="submit" size="sm" disabled={authSaving || !currentPass || !newPass || !confirmPass}>
                {authSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Lock className="h-4 w-4 mr-1.5" />}
                Change Password
              </Button>
            </form>
          </section>

          <Separator className="mb-8" />
        </>
      )}

      {/* Backup Section */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Database Backups</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Automatic backups run daily at 02:00. Up to 7 backups are retained. You can also trigger a manual backup.
        </p>

        <div className="rounded-lg border border-border/60 bg-card p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={handleRunBackup} disabled={backupRunning}>
              {backupRunning ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Database className="h-4 w-4 mr-1.5" />}
              Run Backup Now
            </Button>
            {backupResult && (
              <div className={`flex items-center gap-2 text-sm ${backupResult.ok ? "text-green-400" : "text-red-400"}`}>
                {backupResult.ok ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {backupResult.ok ? `Created: ${backupResult.filename}` : `Failed: ${backupResult.error}`}
              </div>
            )}
          </div>

          {backups.length > 0 ? (
            <div>
              <p className="text-xs text-muted-foreground mb-2">{backups.length} backup(s) stored:</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {backups.map((b) => (
                  <div
                    key={b.filename}
                    className="flex items-center justify-between rounded-md bg-background px-3 py-1.5 text-xs font-mono"
                  >
                    <span className="text-foreground truncate">{b.filename}</span>
                    <div className="flex items-center gap-3 ml-4 shrink-0 text-muted-foreground">
                      <span>{formatBytes(b.size)}</span>
                      <span>{new Date(b.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No backups yet. Run a backup to create one.</p>
          )}
        </div>
      </section>

      <Separator className="mb-8" />

      {/* API Tokens Section */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Key className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">API Tokens</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Generate tokens for CI/CD pipelines. Use as: <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">Authorization: Bearer &lt;token&gt;</code>
        </p>

        <div className="rounded-lg border border-border/60 bg-card p-4 space-y-4">
          {/* Create token form */}
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Token name (e.g. GitHub Actions)"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateToken(); } }}
            />
            <Button size="sm" onClick={handleCreateToken} disabled={creatingToken || !newTokenName.trim()}>
              {creatingToken ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4 mr-1.5" />}
              Generate
            </Button>
          </div>

          {/* Show new token value once */}
          {newTokenValue && (
            <div className="rounded-md border border-green-500/30 bg-green-500/5 p-3">
              <p className="text-xs text-green-400 mb-2 font-medium">Token created — copy it now, it will not be shown again:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-background px-2 py-1.5 text-xs font-mono break-all text-foreground border border-border">
                  {newTokenValue}
                </code>
                <Button size="sm" variant="outline" onClick={handleCopyToken} className="shrink-0">
                  {copiedToken ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 text-xs text-muted-foreground"
                onClick={() => setNewTokenValue(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Token list */}
          {tokens.length > 0 ? (
            <div className="space-y-1">
              {tokens.map((tok) => (
                <div
                  key={tok.id}
                  className="flex items-center justify-between rounded-md bg-background px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{tok.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {tok.token_prefix}... &bull; created {new Date(tok.created_at).toLocaleDateString()}
                      {tok.last_used && ` &bull; last used ${new Date(tok.last_used).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-400"
                    onClick={() => handleDeleteToken(tok.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No tokens yet. Generate one to use with CI/CD pipelines.</p>
          )}
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

      {/* Users Section — admin only */}
      {currentUserRole === "admin" && (
        <>
          <Separator className="my-8" />
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold">User Management</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Manage dashboard users. Each role controls which sections a user can access.
            </p>

            <div className="rounded-lg border border-border/60 bg-card p-4 space-y-4">
              {/* Role legend */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground border-b border-border/40 pb-3">
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-violet-400" />admin — full access</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-400" />monitoreo — SSL &amp; Monitors only</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-green-400" />seguridad — Panel, History, Batch, Schedules</span>
              </div>

              {/* Create user form */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Create new user</p>
                <div className="flex gap-2 flex-wrap">
                  <input
                    className="flex-1 min-w-[120px] rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Username"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                  <input
                    type="password"
                    className="flex-1 min-w-[120px] rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Password (min 8)"
                    value={newUserPass}
                    onChange={(e) => setNewUserPass(e.target.value)}
                  />
                  <select
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                  >
                    <option value="admin">admin</option>
                    <option value="monitoreo">monitoreo</option>
                    <option value="seguridad">seguridad</option>
                  </select>
                  <Button size="sm" onClick={handleCreateUser} disabled={creatingUser || !newUserName.trim() || !newUserPass.trim()}>
                    {creatingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1.5" />}
                    Create
                  </Button>
                </div>
                {userError && <p className="text-sm text-red-400">{userError}</p>}
              </div>

              {/* User list */}
              {users.length > 0 ? (
                <div className="space-y-1">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between rounded-md bg-background px-3 py-2 gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{u.username}</p>
                          <p className="text-xs text-muted-foreground">
                            created {new Date(u.created_at).toLocaleDateString()}
                            {u.last_login && ` · last login ${new Date(u.last_login).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          className="rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          value={u.role}
                          onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                        >
                          <option value="admin">admin</option>
                          <option value="monitoreo">monitoreo</option>
                          <option value="seguridad">seguridad</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-400"
                          onClick={() => handleDeleteUser(u.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No users yet.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
