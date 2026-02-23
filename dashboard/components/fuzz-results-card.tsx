"use client";

import { FlaskConical, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/context";
import type { FuzzResult } from "@/lib/types";

interface Props {
  fuzzResults?: FuzzResult[];
}

function statusColor(code: number): string {
  if (code >= 500) return "text-red-400";
  if (code >= 400) return "text-orange-400";
  if (code >= 300) return "text-yellow-400";
  return "text-green-400";
}

function formatSizeDelta(bytes: number): string {
  if (bytes === 0) return "—";
  const kb = bytes / 1024;
  return kb >= 1 ? `+${kb.toFixed(1)} KB` : `+${bytes} B`;
}

function truncateUrl(url: string, max = 55): string {
  try {
    const u = new URL(url);
    const path = u.pathname + (u.search ? u.search : "");
    const base = u.hostname;
    const full = base + path;
    return full.length > max ? full.slice(0, max) + "…" : full;
  } catch {
    return url.length > max ? url.slice(0, max) + "…" : url;
  }
}

export function FuzzResultsCard({ fuzzResults }: Props) {
  const { t } = useI18n();
  const results = fuzzResults ?? [];

  const countLabel = t("fuzz.count")
    .replace("{n}", String(results.length))
    .replace("{s}", results.length === 1 ? "" : "s");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="h-4 w-4 text-violet-400" />
          {t("fuzz.title")}
          {results.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs font-normal">
              {results.length}
            </Badge>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("fuzz.subtitle")}</p>
      </CardHeader>

      <CardContent>
        {results.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-green-400 py-1">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {t("fuzz.none")}
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">{countLabel}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left font-medium pb-2 pr-4">{t("fuzz.param")}</th>
                    <th className="text-left font-medium pb-2 pr-4">{t("fuzz.url")}</th>
                    <th className="text-left font-medium pb-2 pr-4">{t("fuzz.statusChange")}</th>
                    <th className="text-left font-medium pb-2 pr-4">{t("fuzz.sizeDelta")}</th>
                    <th className="text-left font-medium pb-2">{t("fuzz.errorPattern")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map((r, i) => {
                    const statusChanged = r.fuzz_status !== r.baseline_status;
                    const hasError = Boolean(r.error_pattern);
                    return (
                      <tr key={i} className="align-top">
                        <td className="py-2 pr-4">
                          <code className="font-mono text-violet-300 bg-violet-950/40 px-1.5 py-0.5 rounded">
                            {r.param}
                          </code>
                          <span className="text-muted-foreground ml-1">={r.value}</span>
                        </td>
                        <td className="py-2 pr-4 font-mono text-muted-foreground max-w-[200px]">
                          <span title={r.url}>{truncateUrl(r.url)}</span>
                        </td>
                        <td className="py-2 pr-4 whitespace-nowrap">
                          {statusChanged ? (
                            <span className="inline-flex items-center gap-1">
                              <span className={statusColor(r.baseline_status)}>{r.baseline_status}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className={statusColor(r.fuzz_status)}>{r.fuzz_status}</span>
                            </span>
                          ) : (
                            <span className={`${statusColor(r.fuzz_status)}`}>{r.fuzz_status}</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                          {formatSizeDelta(r.size_diff)}
                        </td>
                        <td className="py-2">
                          {hasError ? (
                            <span className="inline-flex items-center gap-1 text-red-400">
                              <ShieldAlert className="h-3 w-3 shrink-0" />
                              <code className="font-mono text-red-300 bg-red-950/30 px-1 py-0.5 rounded text-[10px]">
                                {r.error_pattern}
                              </code>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-yellow-500">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span className="text-muted-foreground">behavior change</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
