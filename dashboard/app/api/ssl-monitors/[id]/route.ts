import { NextResponse } from "next/server";
import { getSSLMonitor, deleteSSLMonitor, updateSSLMonitor } from "@/lib/db";
import { unregisterSSLMonitor, registerSSLMonitor, SSL_CRON_MAP } from "@/lib/ssl-scheduler";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const monitor = await getSSLMonitor(id);
  if (!monitor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await request.json();
  const fields: Record<string, string | number | null> = {};

  if (body.domain !== undefined) fields.domain = String(body.domain).replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
  if (body.port !== undefined) fields.port = Number(body.port) || 443;
  if (body.interval !== undefined) {
    const interval = body.interval as keyof typeof SSL_CRON_MAP;
    if (!SSL_CRON_MAP[interval]) return NextResponse.json({ error: "Invalid interval" }, { status: 400 });
    fields.interval = interval;
    fields.cron_expr = SSL_CRON_MAP[interval];
  }
  if (body.notify_days_before !== undefined) fields.notify_days_before = Number(body.notify_days_before) || 14;
  if (body.notify_email !== undefined) fields.notify_email = body.notify_email || null;
  if (body.enabled !== undefined) fields.enabled = body.enabled ? 1 : 0;

  const updated = await updateSSLMonitor(id, fields);
  if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  // Re-register cron if interval or domain changed
  unregisterSSLMonitor(id);
  if (updated.enabled) registerSSLMonitor(updated);

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const monitor = await getSSLMonitor(id);
  if (!monitor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  unregisterSSLMonitor(id);
  await deleteSSLMonitor(id);
  return NextResponse.json({ ok: true });
}
