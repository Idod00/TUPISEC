"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Layers, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { BatchProgress } from "@/components/batch-progress";
import { BatchResultsTable } from "@/components/batch-results-table";
import { RiskGauge } from "@/components/risk-gauge";
import { useI18n } from "@/lib/i18n/context";

interface BatchData {
  id: string;
  status: string;
  total_urls: number;
  completed_urls: number;
  failed_urls: number;
  scans: {
    id: string;
    target_url: string;
    status: string;
    finding_count: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    info_count: number;
    risk_score: number | null;
  }[];
}

export default function BatchResultPage() {
  const { id } = useParams<{ id: string }>();
  const [batch, setBatch] = useState<BatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  const fetchBatch = useCallback(() => {
    fetch(`/api/batch/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setBatch(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-red-400 mb-4">{t("batchResult.notFound")}</p>
        <Link href="/">
          <Button variant="outline">{t("batchResult.back")}</Button>
        </Link>
      </div>
    );
  }

  const completedScans = batch.scans?.filter((s) => s.status === "completed") || [];
  const scores = completedScans.map((s) => s.risk_score).filter((s): s is number => s != null);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const totalFindings = completedScans.reduce((sum, s) => sum + s.finding_count, 0);
  const totalCritical = completedScans.reduce((sum, s) => sum + s.critical_count, 0);
  const totalHigh = completedScans.reduce((sum, s) => sum + s.high_count, 0);
  const totalMedium = completedScans.reduce((sum, s) => sum + s.medium_count, 0);

  const isRunning = batch.status === "running";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="h-4 w-4" />
        {t("scan.backDashboard")}
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            {t("batch.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {batch.total_urls} {t("batch.urls")} &middot; {batch.completed_urls} {t("batchResult.completed")} &middot; {batch.failed_urls} {t("batchResult.failed")}
          </p>
        </div>
        {avgScore != null && <RiskGauge score={avgScore} />}
      </div>

      {isRunning && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("batchResult.progress")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BatchProgress batchId={id} onComplete={fetchBatch} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <StatCard label={t("batchResult.totalFindings")} count={totalFindings} colorClass="text-foreground" />
        <StatCard label="Critical" count={totalCritical} colorClass="text-red-400" />
        <StatCard label="High" count={totalHigh} colorClass="text-orange-400" />
        <StatCard label="Medium" count={totalMedium} colorClass="text-yellow-400" />
      </div>

      <h2 className="text-lg font-semibold mb-4">{t("batchResult.scanResults")}</h2>
      <BatchResultsTable scans={batch.scans || []} />
    </div>
  );
}
