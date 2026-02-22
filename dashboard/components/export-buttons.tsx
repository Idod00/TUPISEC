"use client";

import { FileJson, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScanReport } from "@/lib/types";

interface ExportButtonsProps {
  report: ScanReport;
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function reportToCsv(report: ScanReport): string {
  const headers = ["#", "Severity", "Category", "Title", "Detail", "Recommendation"];
  const rows = report.findings.map((f, i) => [
    i + 1,
    f.severity,
    `"${f.category.replace(/"/g, '""')}"`,
    `"${f.title.replace(/"/g, '""')}"`,
    `"${f.detail.replace(/"/g, '""')}"`,
    `"${f.recommendation.replace(/"/g, '""')}"`,
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function ExportButtons({ report }: ExportButtonsProps) {
  const domain = (() => {
    try { return new URL(report.target).hostname.replace(/\./g, "_"); } catch { return "scan"; }
  })();
  const date = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => downloadBlob(reportToCsv(report), `tupisec_${domain}_${date}.csv`, "text/csv")}
      >
        <FileSpreadsheet className="h-4 w-4 mr-1.5" />
        CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => downloadBlob(JSON.stringify(report, null, 2), `tupisec_${domain}_${date}.json`, "application/json")}
      >
        <FileJson className="h-4 w-4 mr-1.5" />
        JSON
      </Button>
    </div>
  );
}
