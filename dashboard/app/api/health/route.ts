import { NextResponse } from "next/server";
import { listScans } from "@/lib/db";

export async function GET() {
  try {
    listScans();
    return NextResponse.json({
      status: "ok",
      uptime: Math.floor(process.uptime()),
      db: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ status: "error", db: "unreachable" }, { status: 503 });
  }
}
