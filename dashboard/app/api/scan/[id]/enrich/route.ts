import { NextResponse } from "next/server";
import { getScan, getScanEnrichment } from "@/lib/db";
import { enrichScan } from "@/lib/enrichment";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scan = await getScan(id);
  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }
  const enrichment = await getScanEnrichment(id);
  return NextResponse.json(enrichment);
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scan = await getScan(id);
  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }
  try {
    const result = await enrichScan(id);
    if (!result) {
      return NextResponse.json(
        { error: "No API keys configured. Add VirusTotal or Shodan keys in Settings." },
        { status: 422 }
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
