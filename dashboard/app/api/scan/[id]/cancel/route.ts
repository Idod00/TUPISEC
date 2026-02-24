import { NextResponse } from "next/server";
import { killScan } from "@/lib/scanner";
import { failScan, getScan } from "@/lib/db";
import { emitProgress } from "@/lib/scan-store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const scan = getScan(id);
  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }
  if (scan.status !== "running") {
    return NextResponse.json({ error: "Scan is not running" }, { status: 400 });
  }

  killScan(id);
  failScan(id);
  emitProgress(id, { phase: "error", step: 0, total: 10, message: "Cancelled by user" });

  return NextResponse.json({ ok: true });
}
