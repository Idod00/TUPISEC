"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function ScanForm() {
  const [url, setUrl] = useState("");
  const [cookies, setCookies] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    let targetUrl = url.trim();
    if (!targetUrl) return;

    // Auto-add https:// if no protocol
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }

    try {
      new URL(targetUrl);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl, cookies: cookies.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to start scan");
        return;
      }
      router.push(`/scan/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
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
            placeholder="https://example.com"
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
              Scanning...
            </>
          ) : (
            "Scan"
          )}
        </Button>
      </div>

      <Collapsible open={authOpen} onOpenChange={setAuthOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" type="button" className="text-muted-foreground w-fit">
            <ChevronDown className={`h-4 w-4 mr-1.5 transition-transform ${authOpen ? "rotate-180" : ""}`} />
            Authentication (Optional)
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
            Cookie header value to send with all requests
          </p>
        </CollapsibleContent>
      </Collapsible>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
