"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getGrade, getGradeColor } from "@/lib/scoring";

interface BatchScan {
  id: string;
  target_url: string;
  status: string;
  finding_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  risk_score: number | null;
}

interface BatchResultsTableProps {
  scans: BatchScan[];
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

export function BatchResultsTable({ scans }: BatchResultsTableProps) {
  const router = useRouter();

  if (scans.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">No scans yet.</p>;
  }

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Target</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Score</TableHead>
            <TableHead className="text-center">Findings</TableHead>
            <TableHead className="text-center text-red-400">C</TableHead>
            <TableHead className="text-center text-orange-400">H</TableHead>
            <TableHead className="text-center text-yellow-400">M</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scans.map((scan) => {
            const grade = scan.risk_score != null ? getGrade(scan.risk_score) : null;
            const gradeColor = grade ? getGradeColor(grade) : undefined;
            return (
              <TableRow
                key={scan.id}
                className="cursor-pointer"
                onClick={() => router.push(`/scan/${scan.id}`)}
              >
                <TableCell className="font-mono text-sm max-w-[250px] truncate">
                  {scan.target_url}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon status={scan.status} />
                    <span className="text-sm capitalize">{scan.status}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {scan.risk_score != null ? (
                    <span className="font-mono font-bold" style={{ color: gradeColor }}>
                      {scan.risk_score} ({grade})
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center font-mono">{scan.finding_count}</TableCell>
                <TableCell className="text-center font-mono text-red-400">{scan.critical_count || 0}</TableCell>
                <TableCell className="text-center font-mono text-orange-400">{scan.high_count || 0}</TableCell>
                <TableCell className="text-center font-mono text-yellow-400">{scan.medium_count || 0}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/scan/${scan.id}`);
                  }}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
