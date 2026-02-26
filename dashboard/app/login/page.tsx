"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2, ArrowRight, ArrowLeft, Lock, Eye, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Step = "landing" | "login" | "setup";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("landing");
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);

  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Setup form state
  const [setupUsername, setSetupUsername] = useState("");
  const [setupPass, setSetupPass] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data) => {
        setHasUsers(data.hasUsers);
        if (!data.hasUsers) setStep("setup");
      })
      .catch(() => setHasUsers(true));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Invalid credentials");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setupPass !== setupConfirm) {
      setError("Passwords don't match");
      return;
    }
    if (setupPass.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (setupUsername.trim().length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: setupUsername.trim(), password: setupPass }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Setup failed");
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while checking status
  if (hasUsers === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4">

        {/* ── Step: Setup (first run, no users) ── */}
        {step === "setup" && (
          <>
            <div className="flex flex-col items-center mb-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-3">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">TupiSec</h1>
              <p className="text-sm text-muted-foreground mt-1">Create your administrator account</p>
              <div className="mt-3 flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-500">
                <AlertTriangle className="h-3.5 w-3.5" />
                First-time setup
              </div>
            </div>

            <form onSubmit={handleSetup} className="space-y-4 rounded-lg border border-border/60 bg-card p-6">
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  autoFocus
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={setupUsername}
                  onChange={(e) => setSetupUsername(e.target.value)}
                  placeholder="admin"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={setupPass}
                  onChange={(e) => setSetupPass(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm Password</label>
                <input
                  type="password"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={setupConfirm}
                  onChange={(e) => setSetupConfirm(e.target.value)}
                  placeholder="Repeat password"
                  required
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Admin Account
              </Button>
            </form>
          </>
        )}

        {/* ── Step: Landing ── */}
        {step === "landing" && (
          <>
            <div className="flex flex-col items-center mb-10">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">TupiSec</h1>
              <p className="text-base text-muted-foreground mt-2">Security Dashboard</p>
              <p className="text-sm text-muted-foreground/70 mt-3 text-center max-w-xs">
                Vulnerability scanning, SSL monitoring, and security enrichment in one place.
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-card p-6 flex flex-col items-center gap-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span>Protected area — authentication required</span>
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => { setError(""); setStep("login"); }}
              >
                Sign In
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {/* ── Step: Login form ── */}
        {step === "login" && (
          <>
            <div className="flex flex-col items-center mb-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-3">
                <Eye className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Welcome back</h1>
              <p className="text-sm text-muted-foreground mt-1">Enter your credentials to continue</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 rounded-lg border border-border/60 bg-card p-6">
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  autoFocus
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Sign In
              </Button>

              <button
                type="button"
                onClick={() => { setError(""); setStep("landing"); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            </form>
          </>
        )}

        <p className="text-center text-xs text-muted-foreground mt-4">
          TupiSec Security Scanner
        </p>
      </div>
    </div>
  );
}
