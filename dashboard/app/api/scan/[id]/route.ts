import { NextResponse } from "next/server";
import { getScan } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scan = await getScan(id);

  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...scan,
    report_json: scan.report_json ? JSON.parse(scan.report_json) : null,
  });
}
