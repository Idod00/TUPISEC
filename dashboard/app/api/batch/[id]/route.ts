import { NextResponse } from "next/server";
import { getBatch, getScan } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const batch = await getBatch(id);

  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const scanIds: string[] = JSON.parse(batch.scan_ids_json || "[]");
  const scanResults = await Promise.all(scanIds.map((sid) => getScan(sid)));
  const scans = scanResults
    .filter((scan): scan is NonNullable<typeof scan> => scan != null)
    .map((scan) => ({
      id: scan.id,
      target_url: scan.target_url,
      status: scan.status,
      created_at: scan.created_at,
      completed_at: scan.completed_at,
      finding_count: scan.finding_count,
      critical_count: scan.critical_count,
      high_count: scan.high_count,
      medium_count: scan.medium_count,
      low_count: scan.low_count,
      info_count: scan.info_count,
      risk_score: scan.risk_score,
    }));

  return NextResponse.json({
    ...batch,
    urls: JSON.parse(batch.urls_json),
    scans,
  });
}
