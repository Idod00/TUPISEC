"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Shield, History, Home, Layers, Clock, Settings2, LockKeyhole, Sun, Moon, LogOut, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";
import { useEffect, useState } from "react";
import type { TranslationKey } from "@/lib/i18n/translations";

type UserRole = "admin" | "monitoreo" | "seguridad";

interface MeData {
  username: string;
  role: UserRole;
}

const allLinks: { href: string; key: TranslationKey; icon: React.ElementType; roles: UserRole[] }[] = [
  { href: "/", key: "nav.dashboard", icon: Home, roles: ["admin", "seguridad"] },
  { href: "/history", key: "nav.history", icon: History, roles: ["admin", "seguridad"] },
  { href: "/batch", key: "nav.batch", icon: Layers, roles: ["admin", "seguridad"] },
  { href: "/schedules", key: "nav.schedules", icon: Clock, roles: ["admin", "seguridad"] },
  { href: "/ssl", key: "nav.ssl", icon: LockKeyhole, roles: ["admin", "monitoreo"] },
  { href: "/monitors", key: "nav.monitors", icon: Activity, roles: ["admin", "monitoreo"] },
  { href: "/settings", key: "nav.settings", icon: Settings2, roles: ["admin"] },
];

const roleBadge: Record<UserRole, { label: string; className: string }> = {
  admin: { label: "admin", className: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  monitoreo: { label: "monitoreo", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  seguridad: { label: "seguridad", className: "bg-green-500/15 text-green-400 border-green-500/30" },
};

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [authEnabled, setAuthEnabled] = useState(false);
  const [me, setMe] = useState<MeData | null>(null);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data) => setAuthEnabled(data.enabled))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!authEnabled) return;
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.username) setMe({ username: data.username, role: data.role }); })
      .catch(() => {});
  }, [authEnabled]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const visibleLinks = authEnabled && me
    ? allLinks.filter((l) => l.roles.includes(me.role))
    : allLinks;

  const badge = me ? roleBadge[me.role] : null;

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-primary">
          <Shield className="h-5 w-5" />
          <span className="text-lg">TupiSec</span>
        </Link>
        <nav className="flex items-center gap-1 flex-1">
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {t(link.key)}
              </Link>
            );
          })}
        </nav>

        {/* User info badge (when auth enabled) */}
        {authEnabled && me && badge && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-medium text-foreground">{me.username}</span>
            <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", badge.className)}>
              {badge.label}
            </span>
          </div>
        )}

        {/* Language toggle */}
        <div className="flex items-center rounded-md border border-border/60 overflow-hidden text-xs font-medium">
          <button
            onClick={() => setLang("es")}
            className={cn(
              "px-2.5 py-1 transition-colors",
              lang === "es"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            ES
          </button>
          <span className="w-px h-4 bg-border/60" />
          <button
            onClick={() => setLang("en")}
            className={cn(
              "px-2.5 py-1 transition-colors",
              lang === "en"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            EN
          </button>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex items-center justify-center rounded-md border border-border/60 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>

        {/* Logout button (only when auth is enabled) */}
        {authEnabled && (
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
            className="flex items-center justify-center rounded-md border border-border/60 p-1.5 text-muted-foreground hover:text-red-400 hover:border-red-400/60 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </header>
  );
}
