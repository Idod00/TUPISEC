"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface DiscoveredUrlsProps {
  urls: string[];
}

export function DiscoveredUrls({ urls }: DiscoveredUrlsProps) {
  const { t } = useI18n();
  if (!urls || urls.length === 0) return null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Globe className="h-4 w-4" />
          {t("discovery.title")} ({urls.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {urls.sort().map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded px-2 py-1.5 text-sm font-mono text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors truncate"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate">{url}</span>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
