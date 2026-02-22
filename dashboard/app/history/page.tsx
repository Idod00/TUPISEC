"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { ScanHistoryTable } from "@/components/scan-history-table";
import type { ScanRecord } from "@/lib/types";

export default function HistoryPage() {
  const [scans, setScans] = useState<Omit<ScanRecord, "report_json">[]>([]);

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <History className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Scan History</h1>
      </div>
      <ScanHistoryTable scans={scans} onDelete={handleDelete} />
    </div>
  );
}
