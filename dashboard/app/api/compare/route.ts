import { NextResponse } from "next/server";
import { getScan } from "@/lib/db";
import { compareScans } from "@/lib/comparison";
import type { ScanReport } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idA = searchParams.get("a");
  const idB = searchParams.get("b");

  if (!idA || !idB) {
    return NextResponse.json({ error: "Both scan IDs (a, b) are required" }, { status: 400 });
  }

  const scanA = getScan(idA);
  const scanB = getScan(idB);

  if (!scanA || !scanB) {
    return NextResponse.json({ error: "One or both scans not found" }, { status: 404 });
  }

  if (!scanA.report_json || !scanB.report_json) {
    return NextResponse.json({ error: "Both scans must be completed" }, { status: 400 });
  }

  const reportA: ScanReport = JSON.parse(scanA.report_json);
  const reportB: ScanReport = JSON.parse(scanB.report_json);

  const comparison = compareScans(reportA.findings, reportB.findings);

  return NextResponse.json({
    scanA: {
      id: scanA.id,
      target_url: scanA.target_url,
      created_at: scanA.created_at,
      risk_score: scanA.risk_score,
      finding_count: scanA.finding_count,
    },
    scanB: {
      id: scanB.id,
      target_url: scanB.target_url,
      created_at: scanB.created_at,
      risk_score: scanB.risk_score,
      finding_count: scanB.finding_count,
    },
    ...comparison,
  });
}
