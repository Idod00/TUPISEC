import { NextResponse } from "next/server";
import { getSSLMonitor, saveSSLCheckHistory, updateSSLMonitorAfterCheck } from "@/lib/db";
import { checkSSL, getSSLStatus } from "@/lib/ssl-checker";
import { randomUUID } from "crypto";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const monitor = await getSSLMonitor(id);
  if (!monitor) {
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  }

  try {
    const result = await checkSSL(monitor.domain, monitor.port);
    const status = getSSLStatus(result, monitor.notify_days_before);

    const checkId = randomUUID();
    await saveSSLCheckHistory(checkId, id, status, result.days_remaining, result);

    const now = new Date().toISOString();
    await updateSSLMonitorAfterCheck(id, status, result.days_remaining, now, now, result);

    return NextResponse.json({ status, result });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
