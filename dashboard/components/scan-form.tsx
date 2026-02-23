"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, ChevronDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export function ScanForm() {
  const [url, setUrl] = useState("");
  const [cookies, setCookies] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [quickScan, setQuickScan] = useState(false);
  const router = useRouter();
  const { t } = useI18n();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    let targetUrl = url.trim();
    if (!targetUrl) return;

    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }

    try {
      new URL(targetUrl);
    } catch {
      setError(t("scan.validUrl"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl, cookies: cookies.trim() || undefined, quick_scan: quickScan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("scan.startFailed"));
        return;
      }
      router.push(`/scan/${data.id}`);
    } catch {
      setError(t("scan.networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t("scan.placeholder")}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="pl-9 font-mono"
            disabled={loading}
          />
        </div>
        <Button type="submit" disabled={loading || !url.trim()} className="min-w-[120px]">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("scan.scanning")}
            </>
          ) : (
            t("scan.scanButton")
          )}
        </Button>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => setQuickScan(!quickScan)}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors",
            quickScan
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <Zap className="h-3 w-3" />
          {quickScan ? "Quick Scan" : "Full Scan"}
        </button>
        <span className="text-xs text-muted-foreground">
          {quickScan ? "Skips slow modules (ports, subdomains, injection tests)" : "Runs all security modules"}
        </span>
      </div>

      <Collapsible open={authOpen} onOpenChange={setAuthOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" type="button" className="text-muted-foreground w-fit">
            <ChevronDown className={`h-4 w-4 mr-1.5 transition-transform ${authOpen ? "rotate-180" : ""}`} />
            {t("scan.auth")}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <Textarea
            placeholder={t("scan.cookiePlaceholder")}
            value={cookies}
            onChange={(e) => setCookies(e.target.value)}
            className="font-mono text-sm min-h-[60px]"
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t("scan.authDesc")}
          </p>
        </CollapsibleContent>
      </Collapsible>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
