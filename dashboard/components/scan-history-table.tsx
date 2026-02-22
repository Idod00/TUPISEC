"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ExternalLink, Loader2, CheckCircle2, XCircle, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getGrade, getGradeColor } from "@/lib/scoring";
import type { ScanRecord } from "@/lib/types";

interface ScanHistoryTableProps {
  scans: Omit<ScanRecord, "report_json">[];
  onDelete: (id: string) => void;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "running":
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-primary" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-400" />;
    default:
      return null;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-PY", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function ScanHistoryTable({ scans, onDelete }: ScanHistoryTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  if (scans.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        No scans yet. Start your first scan from the Dashboard.
      </p>
    );
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  function handleCompare() {
    if (selected.length === 2) {
      router.push(`/compare?a=${selected[0]}&b=${selected[1]}`);
    }
  }

  return (
    <div>
      {selected.length === 2 && (
        <div className="mb-3 flex justify-end">
          <Button size="sm" onClick={handleCompare}>
            <GitCompare className="h-4 w-4 mr-1.5" />
            Compare Selected
          </Button>
        </div>
      )}
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead className="text-center">Findings</TableHead>
              <TableHead className="text-center text-red-400">C</TableHead>
              <TableHead className="text-center text-orange-400">H</TableHead>
              <TableHead className="text-center text-yellow-400">M</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scans.map((scan) => {
              const grade = scan.risk_score != null ? getGrade(scan.risk_score) : null;
              const gradeColor = grade ? getGradeColor(grade) : undefined;
              const isSelected = selected.includes(scan.id);
              return (
                <TableRow
                  key={scan.id}
                  className={`cursor-pointer ${isSelected ? "bg-primary/5" : ""}`}
                  onClick={() => router.push(`/scan/${scan.id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {scan.status === "completed" && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(scan.id)}
                        className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm max-w-[250px] truncate">
                    {scan.target_url}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(scan.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon status={scan.status} />
                      <span className="text-sm capitalize">{scan.status}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {scan.risk_score != null ? (
                      <span className="font-mono font-bold text-sm" style={{ color: gradeColor }}>
                        {scan.risk_score} ({grade})
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-mono">{scan.finding_count}</TableCell>
                  <TableCell className="text-center font-mono text-red-400">
                    {scan.critical_count || 0}
                  </TableCell>
                  <TableCell className="text-center font-mono text-orange-400">
                    {scan.high_count || 0}
                  </TableCell>
                  <TableCell className="text-center font-mono text-yellow-400">
                    {scan.medium_count || 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/scan/${scan.id}`);
                        }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(scan.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
