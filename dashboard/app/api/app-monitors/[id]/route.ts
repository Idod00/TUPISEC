import { NextResponse } from "next/server";
import { getAppMonitor, deleteAppMonitor, updateAppMonitor } from "@/lib/db";
import { unregisterAppMonitor, registerAppMonitor, APP_CRON_MAP } from "@/lib/app-monitor-scheduler";
import { encryptValue } from "@/lib/crypto";
import type { AppMonitorInterval } from "@/lib/types";

function normalizeUrl(raw: string): string {
  const s = raw.trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}


export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  unregisterAppMonitor(id);
  const deleted = deleteAppMonitor(id);
  if (!deleted) {
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const monitor = getAppMonitor(id);
  if (!monitor) {
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { name, url, username, password, interval, enabled, notify_email } = body;

    const fields: Record<string, unknown> = {};
    if (name !== undefined) fields.name = name;
    if (url !== undefined) fields.url = normalizeUrl(url);
    if (username !== undefined) fields.username = username;
    if (password !== undefined) fields.password_enc = encryptValue(password);
    if (interval !== undefined) {
      fields.interval = interval;
      fields.cron_expr = APP_CRON_MAP[interval as AppMonitorInterval];
    }
    if (enabled !== undefined) fields.enabled = enabled;
    if (notify_email !== undefined) fields.notify_email = notify_email || null;

    const updated = updateAppMonitor(id, fields as Parameters<typeof updateAppMonitor>[1]);
    if (!updated) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    // Re-register cron if interval or enabled changed
    if (interval !== undefined || enabled !== undefined) {
      unregisterAppMonitor(id);
      if (updated.enabled) {
        registerAppMonitor(updated);
      }
    }

    const { password_enc: _p, ...safeMonitor } = updated;
    return NextResponse.json(safeMonitor);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
