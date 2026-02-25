import { NextResponse } from "next/server";
import { listScans } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const scans = await listScans();
  return NextResponse.json(scans);
}
