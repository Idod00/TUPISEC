"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScanReport } from "@/lib/types";

interface PdfDownloadButtonProps {
  report: ScanReport;
  scanId?: string;
  riskScore?: number | null;
}

export function PdfDownloadButton({ report, scanId, riskScore }: PdfDownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      // Fetch screenshot as base64 if available
      let screenshotBase64: string | null = null;
      if (scanId) {
        try {
          const screenshotRes = await fetch(`/api/scan/${scanId}/screenshot`);
          if (screenshotRes.ok) {
            const blob = await screenshotRes.blob();
            screenshotBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          }
        } catch {
          // screenshot not available, continue without it
        }
      }

      const { pdf } = await import("@react-pdf/renderer");
      const { PdfReport } = await import("./pdf-report");
      const blob = await pdf(
        <PdfReport report={report} riskScore={riskScore} screenshotBase64={screenshotBase64} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const domain = new URL(report.target).hostname.replace(/\./g, "_");
      a.href = url;
      a.download = `tupisec_${domain}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleDownload} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      Download PDF
    </Button>
  );
}
