"use client";

import { Network, AlertTriangle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/context";
import type { SubdomainEntry } from "@/lib/types";

interface Props {
  subdomains?: SubdomainEntry[];
}

function statusColor(code: number): string {
  if (code === 0) return "text-muted-foreground";
  if (code >= 500) return "text-red-400";
  if (code >= 400) return "text-orange-400";
  if (code >= 300) return "text-yellow-400";
  return "text-green-400";
}

export function SubdomainsCard({ subdomains }: Props) {
  const { t } = useI18n();
  const entries = subdomains ?? [];

  if (entries.length === 0) return null;

  const takeovers = entries.filter((e) => e.takeover_risk).length;
  const live = entries.filter((e) => e.status > 0 && e.status < 400).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Network className="h-4 w-4 text-cyan-400" />
          {t("subdomains.title")}
          <Badge variant="secondary" className="ml-auto text-xs font-normal">
            {entries.length}
          </Badge>
        </CardTitle>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>
            <span className="text-green-400 font-medium">{live}</span> {t("subdomains.live")}
          </span>
          {takeovers > 0 && (
            <span className="flex items-center gap-1 text-red-400 font-medium">
              <AlertTriangle className="h-3 w-3" />
              {takeovers} {t("subdomains.takeover")}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left font-medium pb-2 pr-4">{t("subdomains.subdomain")}</th>
                <th className="text-left font-medium pb-2 pr-4">{t("subdomains.ip")}</th>
                <th className="text-left font-medium pb-2 pr-4">{t("subdomains.status")}</th>
                <th className="text-left font-medium pb-2">{t("subdomains.risk")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry, i) => (
                <tr key={i} className={entry.takeover_risk ? "bg-red-950/20" : ""}>
                  <td className="py-2 pr-4">
                    <a
                      href={`https://${entry.subdomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-cyan-300 hover:text-cyan-200 transition-colors"
                    >
                      {entry.subdomain}
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                  </td>
                  <td className="py-2 pr-4 font-mono text-muted-foreground">
                    {entry.ip || "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <span className={statusColor(entry.status)}>
                      {entry.status === 0 ? "—" : entry.status}
                    </span>
                  </td>
                  <td className="py-2">
                    {entry.takeover_risk ? (
                      <span className="inline-flex items-center gap-1 text-red-400 font-medium">
                        <AlertTriangle className="h-3 w-3" />
                        {t("subdomains.takoverRisk")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
