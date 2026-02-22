"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Clock, ExternalLink, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScanForm } from "@/components/scan-form";
import { getGrade, getGradeColor } from "@/lib/scoring";
import type { ScanRecord } from "@/lib/types";
import Link from "next/link";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-PY", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function HomePage() {
  const [recents, setRecents] = useState<Omit<ScanRecord, "report_json">[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/scans")
      .then((r) => r.json())
      .then((data) => setRecents(data.slice(0, 5)))
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">TupiSec Scanner</h1>
        </div>
        <p className="text-muted-foreground">
          Enter a URL to analyze its security posture
        </p>
      </div>

      <Card className="mb-4 border-primary/20">
        <CardContent className="p-6">
          <ScanForm />
        </CardContent>
      </Card>

      <div className="flex justify-center mb-8">
        <Link href="/batch">
          <Button variant="outline" size="sm">
            <Layers className="h-4 w-4 mr-1.5" />
            Batch Scan (Multiple URLs)
          </Button>
        </Link>
      </div>

      {recents.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              Recent Scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recents.map((scan) => {
                const grade = scan.risk_score != null ? getGrade(scan.risk_score) : null;
                const gradeColor = grade ? getGradeColor(grade) : undefined;
                return (
                  <button
                    key={scan.id}
                    onClick={() => router.push(`/scan/${scan.id}`)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors hover:bg-secondary/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate font-mono text-sm">{scan.target_url}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      {scan.risk_score != null && grade && (
                        <span className="text-xs font-mono font-bold" style={{ color: gradeColor }}>
                          {grade}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(scan.created_at)}
                      </span>
                      {scan.status === "completed" && (
                        <span className="text-xs font-mono text-primary">
                          {scan.finding_count} findings
                        </span>
                      )}
                      {scan.status === "running" && (
                        <span className="text-xs text-yellow-400">Running...</span>
                      )}
                      {scan.status === "failed" && (
                        <span className="text-xs text-red-400">Failed</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
