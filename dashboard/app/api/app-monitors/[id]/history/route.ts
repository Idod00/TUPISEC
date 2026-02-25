import { NextResponse } from "next/server";
import { getAppCheckHistory, getAppUptime } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const history = getAppCheckHistory(id, 50);
  const uptime24h = getAppUptime(id, 24);
  return NextResponse.json({ history, uptime24h });
}
