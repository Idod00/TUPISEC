"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FindingCard } from "./finding-card";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import type { Finding, Severity, FindingStatusRecord, FindingStatusValue } from "@/lib/types";

const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

const filterColors: Record<string, string> = {
  ALL: "bg-primary/20 text-primary border-primary/30",
  CRITICAL: "bg-red-500/20 text-red-400 border-red-500/30",
  HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  LOW: "bg-green-500/20 text-green-400 border-green-500/30",
  INFO: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

interface FindingsTableProps {
  findings: Finding[];
  statusMap?: Map<number, FindingStatusRecord>;
  onStatusChange?: (findingIndex: number, status: string, note?: string) => void;
  scanId?: string;
}

export function FindingsTable({ findings, statusMap, onStatusChange, scanId }: FindingsTableProps) {
  const [filter, setFilter] = useState<Severity | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<FindingStatusValue | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const { t } = useI18n();

  const filtered = useMemo(() => {
    let result = findings.map((f, i) => ({ finding: f, originalIndex: i }));
    if (filter !== "ALL") {
      result = result.filter(({ finding }) => finding.severity === filter);
    }
    if (statusFilter !== "ALL" && statusMap) {
      result = result.filter(({ originalIndex }) => {
        const sr = statusMap.get(originalIndex);
        const currentStatus = sr?.status || "open";
        return currentStatus === statusFilter;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        ({ finding }) =>
          finding.title.toLowerCase().includes(q) ||
          finding.category.toLowerCase().includes(q) ||
          finding.detail.toLowerCase().includes(q)
      );
    }
    return result;
  }, [findings, filter, statusFilter, search, statusMap]);

  const statusLabels: Record<string, string> = {
    ALL: t("findingsTable.allStatus"),
    open: t("findingStatus.open"),
    in_progress: t("findingStatus.inProgress"),
    accepted: t("findingStatus.accepted"),
    resolved: t("findingStatus.resolved"),
    false_positive: t("findingStatus.falsePositive"),
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("findingsTable.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(["ALL", ...SEVERITY_ORDER] as const).map((s) => (
            <Button
              key={s}
              variant="outline"
              size="sm"
              onClick={() => setFilter(s)}
              className={cn(
                "text-xs h-7 px-2.5",
                filter === s ? filterColors[s] : "text-muted-foreground"
              )}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {statusMap && (
        <div className="flex flex-wrap gap-1">
          {(["ALL", "open", "in_progress", "accepted", "resolved", "false_positive"] as const).map((s) => (
            <Button
              key={s}
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "text-xs h-7 px-2.5",
                statusFilter === s ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground"
              )}
            >
              {statusLabels[s]}
            </Button>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {t("findingsTable.showing", { count: filtered.length, total: findings.length })}
      </p>

      <div className="space-y-2">
        {filtered.map(({ finding, originalIndex }) => (
          <FindingCard
            key={originalIndex}
            finding={finding}
            index={originalIndex + 1}
            statusRecord={statusMap?.get(originalIndex)}
            onStatusChange={onStatusChange ? (status, note) => onStatusChange(originalIndex, status, note) : undefined}
          />
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">{t("findingsTable.noMatch")}</p>
        )}
      </div>
    </div>
  );
}
