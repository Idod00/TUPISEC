"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, ChevronDown, ExternalLink, Trash2,
  Loader2, RefreshCw, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getGrade, getGradeColor } from "@/lib/scoring";
import { useI18n } from "@/lib/i18n/context";
import type { ScanRecord } from "@/lib/types";

type ScanRow = Omit<ScanRecord, "report_json">;

interface GroupedHistoryTableProps {
  scans: ScanRow[];
  onDelete: (id: string) => void;
  onDeleteGroup?: (ids: string[]) => void;
}

function formatDate(iso: string, dateLocale: string) {
  return new Date(iso).toLocaleString(dateLocale, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function timeAgo(iso: string, lang: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (lang === "es") {
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `hace ${days}d`;
  }
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function ScoreCell({ scan }: { scan: ScanRow }) {
  if (scan.risk_score == null) return <span className="text-muted-foreground">-</span>;
  const grade = getGrade(scan.risk_score);
  const color = getGradeColor(grade);
  return (
    <span className="font-mono font-bold text-sm" style={{ color }}>
      {grade} {scan.risk_score}
    </span>
  );
}

function DeltaCell({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-muted-foreground text-xs">—</span>;
  if (delta === 0) return <span className="text-muted-foreground text-xs flex items-center gap-0.5"><Minus className="h-3 w-3" />0</span>;
  if (delta < 0) {
    return (
      <span className="text-green-400 text-xs flex items-center gap-0.5">
        <TrendingDown className="h-3 w-3" />
        {delta}
      </span>
    );
  }
  return (
    <span className="text-red-400 text-xs flex items-center gap-0.5">
      <TrendingUp className="h-3 w-3" />
      +{delta}
    </span>
  );
}

function ScoreSparkline({ scores }: { scores: (number | null)[] }) {
  const valid = (scores.filter((s) => s != null) as number[]).slice(0, 10).reverse();
  if (valid.length < 2) return <DeltaCell delta={null} />;

  const W = 72, H = 22, PAD = 2;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;

  const pts = valid
    .map((s, i) => {
      const x = PAD + (i / (valid.length - 1)) * (W - PAD * 2);
      const y = PAD + ((max - s) / range) * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const newest = valid[valid.length - 1];
  const oldest = valid[0];
  const color = newest < oldest ? "#4ade80" : newest > oldest ? "#f87171" : "#94a3b8";
  const delta = newest - oldest;

  return (
    <div className="inline-flex flex-col items-center gap-0.5">
      <svg width={W} height={H}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" />
        {valid.map((s, i) => {
          const x = PAD + (i / (valid.length - 1)) * (W - PAD * 2);
          const y = PAD + ((max - s) / range) * (H - PAD * 2);
          return <circle key={i} cx={x} cy={y} r="1.8" fill={color} />;
        })}
      </svg>
      <span className="text-[10px]" style={{ color }}>
        {delta > 0 ? `+${delta}` : delta}
      </span>
    </div>
  );
}

export function GroupedHistoryTable({ scans, onDelete, onDeleteGroup }: GroupedHistoryTableProps) {
  const router = useRouter();
  const { t, lang, dateLocale } = useI18n();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [retestingUrl, setRetestingUrl] = useState<string | null>(null);

  // Group by target_url
  const grouped = new Map<string, ScanRow[]>();
  for (const scan of scans) {
    const url = scan.target_url;
    if (!grouped.has(url)) grouped.set(url, []);
    grouped.get(url)!.push(scan);
  }

  // Sort each group newest-first, then sort groups by most-recent scan
  const groups = Array.from(grouped.entries()).map(([url, urlScans]) => {
    const sorted = [...urlScans].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return { url, scans: sorted };
  });
  groups.sort(
    (a, b) =>
      new Date(b.scans[0].created_at).getTime() - new Date(a.scans[0].created_at).getTime()
  );

  const toggleExpand = (url: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const handleRetest = async (url: string) => {
    setRetestingUrl(url);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      router.push(`/scan/${data.id}`);
    } catch {
      setRetestingUrl(null);
    }
  };

  if (groups.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        {t("grouped.noScans")}
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[24px]" />
            <TableHead>{t("grouped.target")}</TableHead>
            <TableHead className="text-center">{t("grouped.latestScore")}</TableHead>
            <TableHead className="text-center">{t("grouped.trend")}</TableHead>
            <TableHead className="text-center">{t("grouped.scans")}</TableHead>
            <TableHead>{t("grouped.lastScan")}</TableHead>
            <TableHead className="w-[160px]">{t("grouped.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map(({ url, scans: urlScans }) => {
            const latest = urlScans[0];
            const prev = urlScans[1] ?? null;
            const isExpanded = expanded.has(url);
            const isRetesting = retestingUrl === url;

            const delta =
              latest.risk_score != null && prev?.risk_score != null
                ? latest.risk_score - prev.risk_score
                : null;

            return (
              <>
                {/* Group header row */}
                <TableRow
                  key={url}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => toggleExpand(url)}
                >
                  <TableCell className="pr-0">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm max-w-[220px] truncate font-medium">
                    {url}
                  </TableCell>
                  <TableCell className="text-center">
                    <ScoreCell scan={latest} />
                  </TableCell>
                  <TableCell className="text-center">
                    <ScoreSparkline scores={urlScans.map((s) => s.risk_score ?? null)} />
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {urlScans.length}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {timeAgo(latest.created_at, lang)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => router.push(`/scan/${latest.id}`)}
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        {t("grouped.view")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2"
                        disabled={isRetesting}
                        onClick={() => handleRetest(url)}
                      >
                        {isRetesting ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        )}
                        {t("grouped.retest")}
                      </Button>
                      {onDeleteGroup && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2 text-red-400 hover:text-red-300"
                          onClick={() => onDeleteGroup(urlScans.map((s) => s.id))}
                          title={t("grouped.deleteAll")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {/* Expanded inline timeline */}
                {isExpanded &&
                  urlScans.map((scan) => (
                    <TableRow
                      key={scan.id}
                      className="bg-secondary/20 hover:bg-secondary/30 cursor-pointer"
                      onClick={() => router.push(`/scan/${scan.id}`)}
                    >
                      <TableCell />
                      <TableCell className="pl-8 text-sm text-muted-foreground">
                        {formatDate(scan.created_at, dateLocale)}
                      </TableCell>
                      <TableCell className="text-center">
                        <ScoreCell scan={scan} />
                      </TableCell>
                      <TableCell className="text-center" />
                      <TableCell className="text-center">
                        <span className="text-xs text-muted-foreground font-mono">
                          C:{scan.critical_count || 0} H:{scan.high_count || 0} M:{scan.medium_count || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground capitalize">
                        {scan.status}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => router.push(`/scan/${scan.id}`)}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-300"
                            onClick={() => onDelete(scan.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
