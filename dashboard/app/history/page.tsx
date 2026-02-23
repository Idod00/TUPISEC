"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { GroupedHistoryTable } from "@/components/grouped-history-table";
import { ScoreTrendChart } from "@/components/score-trend-chart";
import { useI18n } from "@/lib/i18n/context";
import type { ScanRecord } from "@/lib/types";

export default function HistoryPage() {
  const [scans, setScans] = useState<Omit<ScanRecord, "report_json">[]>([]);
  const { t } = useI18n();

  useEffect(() => {
    fetchScans();
  }, []);

  function fetchScans() {
    fetch("/api/scans")
      .then((r) => r.json())
      .then(setScans)
      .catch(() => {});
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/scans/${id}`, { method: "DELETE" });
    if (res.ok) {
      setScans((prev) => prev.filter((s) => s.id !== id));
    }
  }

  async function handleDeleteGroup(ids: string[]) {
    await Promise.all(ids.map((id) => fetch(`/api/scans/${id}`, { method: "DELETE" })));
    setScans((prev) => prev.filter((s) => !ids.includes(s.id)));
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <History className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">{t("history.title")}</h1>
      </div>
      <ScoreTrendChart scans={scans} />
      <GroupedHistoryTable scans={scans} onDelete={handleDelete} onDeleteGroup={handleDeleteGroup} />
    </div>
  );
}
