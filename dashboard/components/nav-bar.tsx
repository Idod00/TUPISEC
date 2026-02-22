"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, History, Home, Layers, Clock, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/translations";

const links: { href: string; key: TranslationKey; icon: React.ElementType }[] = [
  { href: "/", key: "nav.dashboard", icon: Home },
  { href: "/history", key: "nav.history", icon: History },
  { href: "/batch", key: "nav.batch", icon: Layers },
  { href: "/schedules", key: "nav.schedules", icon: Clock },
  { href: "/settings", key: "nav.settings", icon: Settings2 },
];

export function NavBar() {
  const pathname = usePathname();
  const { lang, setLang, t } = useI18n();

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-primary">
          <Shield className="h-5 w-5" />
          <span className="text-lg">TupiSec</span>
        </Link>
        <nav className="flex items-center gap-1 flex-1">
          {links.map((link) => {
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
      </div>
    </header>
  );
}
