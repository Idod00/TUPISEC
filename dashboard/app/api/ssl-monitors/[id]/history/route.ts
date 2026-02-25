import { NextResponse } from "next/server";
import { getSSLMonitor, getSSLCheckHistory } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const monitor = await getSSLMonitor(id);
  if (!monitor) {
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  }
  const history = await getSSLCheckHistory(id, 30);
  return NextResponse.json(history);
}
