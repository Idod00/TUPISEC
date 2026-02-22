import { NextResponse } from "next/server";
import { getSSLMonitor, deleteSSLMonitor } from "@/lib/db";
import { unregisterSSLMonitor } from "@/lib/ssl-scheduler";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const monitor = getSSLMonitor(id);
  if (!monitor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  unregisterSSLMonitor(id);
  deleteSSLMonitor(id);
  return NextResponse.json({ ok: true });
}
