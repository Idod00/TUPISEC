"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useI18n } from "@/lib/i18n/context";

export function BatchForm() {
  const [urls, setUrls] = useState("");
  const [cookies, setCookies] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const router = useRouter();
  const { t } = useI18n();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const urlList = urls
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    if (urlList.length === 0) {
      setError(t("batch.enterUrl"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: urlList, cookies: cookies.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("batch.startFailed"));
        return;
      }
      router.push(`/batch/${data.id}`);
    } catch {
      setError(t("batch.networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
          {t("batch.urlsLabel")}
        </label>
        <Textarea
          placeholder={"https://example.com\nhttps://another-site.com\nhttps://third-domain.org"}
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          className="font-mono text-sm min-h-[120px]"
          disabled={loading}
        />
      </div>

      <Collapsible open={authOpen} onOpenChange={setAuthOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" type="button" className="text-muted-foreground">
            <ChevronDown className={`h-4 w-4 mr-1.5 transition-transform ${authOpen ? "rotate-180" : ""}`} />
            {t("batch.auth")}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <Textarea
            placeholder="session=abc123; token=xyz789"
            value={cookies}
            onChange={(e) => setCookies(e.target.value)}
            className="font-mono text-sm min-h-[60px]"
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t("batch.authDesc")}
          </p>
        </CollapsibleContent>
      </Collapsible>

      <Button type="submit" disabled={loading || !urls.trim()} className="w-full">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {t("batch.starting")}
          </>
        ) : (
          <>
            <Layers className="h-4 w-4 mr-2" />
            {t("batch.start")}
          </>
        )}
      </Button>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
