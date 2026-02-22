"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Globe, Loader2, GitCompare, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/context";
import { Separator } from "@/components/ui/separator";
import { StatCard } from "@/components/stat-card";
import { SummaryCharts } from "@/components/summary-charts";
import { TechStackCard } from "@/components/tech-stack-card";
import { FindingsTable } from "@/components/findings-table";
import { DiscoveredUrls } from "@/components/discovered-urls";
import { ScanProgress } from "@/components/scan-progress";
import { PdfDownloadButton } from "@/components/pdf-download-button";
import { ExportButtons } from "@/components/export-buttons";
import { RiskGauge } from "@/components/risk-gauge";
import { RemediationProgress } from "@/components/remediation-progress";
import { DnsWhoisCard } from "@/components/dns-whois-card";
import { ScreenshotCard } from "@/components/screenshot-card";
import { calculateScore } from "@/lib/scoring";
import type { ScanReport, ScanRecord, FindingStatusRecord } from "@/lib/types";

export default function ScanReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const [report, setReport] = useState<ScanReport | null>(null);
  const [status, setStatus] = useState<string>("loading");
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [statuses, setStatuses] = useState<FindingStatusRecord[]>([]);
  const [previousScans, setPreviousScans] = useState<{ id: string; created_at: string }[]>([]);
  const [retesting, setRetesting] = useState(false);

  const handleRetest = async () => {
    if (!report) return;
    setRetesting(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: report.target }),
      });
      const data = await res.json();
      router.push(`/scan/${data.id}`);
    } catch {
      setRetesting(false);
    }
  };

  const fetchReport = useCallback(() => {
    fetch(`/api/scan/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setStatus(data.status);
        setRiskScore(data.risk_score ?? null);
        if (data.report_json) {
          setReport(data.report_json);
          // If risk_score missing, calculate client-side
          if (data.risk_score == null && data.report_json) {
            setRiskScore(calculateScore(data.report_json));
          }
          // Fetch finding statuses
          fetch(`/api/scans`)
            .then((r) => r.json())
            .then((scans: Omit<ScanRecord, "report_json">[]) => {
              const target = data.report_json?.target || data.target_url;
              const prev = scans
                .filter((s: Omit<ScanRecord, "report_json">) => s.status === "completed" && s.id !== id && s.target_url === target)
                .slice(0, 5);
              setPreviousScans(prev);
            })
            .catch(() => {});
        }
        if (data.error) {
          setError(data.error);
        }
      })
      .catch(() => setError("Failed to load scan"));

    // Fetch finding statuses
    fetch(`/api/scan/${id}/findings-statuses`)
      .then((r) => { if (r.ok) return r.json(); return []; })
      .then((data) => { if (Array.isArray(data)) setStatuses(data); })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleStatusChange = useCallback(async (findingIndex: number, newStatus: string, note?: string) => {
    try {
      const res = await fetch(`/api/scan/${id}/findings/${findingIndex}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, note: note ?? "" }),
      });
      if (res.ok) {
        const updated = await res.json();
        setStatuses((prev) => {
          const filtered = prev.filter((s) => s.finding_index !== findingIndex);
          return [...filtered, updated];
        });
      }
    } catch {
      // ignore
    }
  }, [id]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error && status !== "running") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <Link href="/">
          <Button variant="outline">{t("common.backDashboard")}</Button>
        </Link>
      </div>
    );
  }

  if (status === "running") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          {t("scan.backDashboard")}
        </Link>
        <h1 className="text-2xl font-bold mb-6">{t("scan.scanning")}…</h1>
        <ScanProgress scanId={id} onComplete={fetchReport} />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-muted-foreground">{t("scan.noReport")}</p>
      </div>
    );
  }

  const summary = report.summary || {};
  const statusMap = new Map(statuses.map((s) => [s.finding_index, s]));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
            <ArrowLeft className="h-4 w-4" />
            {t("scan.backDashboard")}
          </Link>
          <h1 className="text-2xl font-bold">{t("scan.title")}</h1>
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" />
              <span className="font-mono">{report.target}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(report.scan_date).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {riskScore != null && <RiskGauge score={riskScore} />}
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={handleRetest} disabled={retesting}>
              {retesting ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1.5" />
              )}
              {t("scan.retest")}
            </Button>
            <PdfDownloadButton report={report} scanId={id} riskScore={riskScore} />
            <ExportButtons report={report} />
          </div>
        </div>
      </div>

      {/* Compare button */}
      {previousScans.length > 0 && (
        <div className="mb-4">
          <Link href={`/compare?a=${previousScans[0].id}&b=${id}`}>
            <Button variant="outline" size="sm">
              <GitCompare className="h-4 w-4 mr-1.5" />
              {t("scan.compareWithPrev")}
            </Button>
          </Link>
        </div>
      )}

      <Separator className="mb-6" />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 mb-6">
        <StatCard label="Critical" count={summary.CRITICAL || 0} colorClass="text-red-400" />
        <StatCard label="High" count={summary.HIGH || 0} colorClass="text-orange-400" />
        <StatCard label="Medium" count={summary.MEDIUM || 0} colorClass="text-yellow-400" />
        <StatCard label="Low" count={summary.LOW || 0} colorClass="text-cyan-400" />
        <StatCard label="Info" count={summary.INFO || 0} colorClass="text-blue-400" />
      </div>

      {/* Remediation Progress */}
      <div className="mb-6">
        <RemediationProgress totalFindings={report.findings.length} statuses={statuses} />
      </div>

      {/* Charts */}
      <div className="mb-6">
        <SummaryCharts summary={summary} findings={report.findings} />
      </div>

      {/* Screenshot */}
      <div className="mb-6">
        <ScreenshotCard scanId={id} />
      </div>

      {/* Tech Stack */}
      <div className="mb-6">
        <TechStackCard techStack={report.tech_stack} cveData={report.cve_data} />
      </div>

      {/* DNS/WHOIS */}
      <div className="mb-6">
        <DnsWhoisCard dnsRecords={report.dns_records} whoisInfo={report.whois_info} />
      </div>

      {/* Findings */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">
          {t("scan.findings")} ({report.findings.length})
        </h2>
        <FindingsTable
          findings={report.findings}
          statusMap={statusMap}
          onStatusChange={handleStatusChange}
          scanId={id}
        />
      </div>

      {/* Discovered URLs */}
      <div className="mb-6">
        <DiscoveredUrls urls={report.discovered_urls} />
      </div>
    </div>
  );
}
