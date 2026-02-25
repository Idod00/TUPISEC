import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAppMonitor, saveAppCheckHistory, updateAppMonitorAfterCheck } from "@/lib/db";
import { checkApp } from "@/lib/app-checker";
import { decryptValue } from "@/lib/crypto";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const monitor = getAppMonitor(id);
  if (!monitor) {
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  }

  try {
    let password: string;
    try {
      password = decryptValue(monitor.password_enc);
    } catch {
      password = monitor.password_enc;
    }

    const result = await checkApp(monitor.url, monitor.username, password);

    const checkId = randomUUID();
    saveAppCheckHistory(
      checkId,
      id,
      result.checked_at,
      result.status,
      result.response_ms,
      result.status_code ?? null,
      result.error ?? null
    );

    const now = new Date().toISOString();
    updateAppMonitorAfterCheck(id, result.status, result.response_ms, now, now);

    return NextResponse.json({ status: result.status, result });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
