import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { listAppMonitors, createAppMonitor } from "@/lib/db";
import { registerAppMonitor, APP_CRON_MAP } from "@/lib/app-monitor-scheduler";
import { encryptValue } from "@/lib/crypto";
import type { AppMonitorInterval } from "@/lib/types";

function normalizeUrl(raw: string): string {
  const s = raw.trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

export async function GET() {
  const monitors = await listAppMonitors();
  // Never send password_enc to the client
  return NextResponse.json(
    monitors.map(({ password_enc: _p, ...m }) => m)
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, url, username, password, interval, notify_email, monitor_type } = body;

    const type: "availability" | "login" =
      monitor_type === "availability" ? "availability" : "login";

    if (!name || !url || !interval) {
      return NextResponse.json(
        { error: "name, url, and interval are required" },
        { status: 400 }
      );
    }
    if (type === "login" && (!username || !password)) {
      return NextResponse.json(
        { error: "username and password are required for login monitors" },
        { status: 400 }
      );
    }

    const validIntervals: AppMonitorInterval[] = ["5min", "15min", "30min", "1h", "6h", "1d"];
    if (!validIntervals.includes(interval as AppMonitorInterval)) {
      return NextResponse.json(
        { error: `interval must be one of: ${validIntervals.join(", ")}` },
        { status: 400 }
      );
    }

    const cronExpr = APP_CRON_MAP[interval as AppMonitorInterval];
    const passwordEnc = type === "login" ? encryptValue(password) : "";
    const now = new Date().toISOString();

    const monitor = await createAppMonitor({
      id: randomUUID(),
      name: name.trim(),
      url: normalizeUrl(url),
      monitor_type: type,
      username: type === "login" ? username.trim() : "",
      password_enc: passwordEnc,
      interval: interval as AppMonitorInterval,
      cron_expr: cronExpr,
      enabled: 1,
      created_at: now,
      notify_email: notify_email || null,
    });

    registerAppMonitor(monitor);

    const { password_enc: _p, ...safeMonitor } = monitor;
    return NextResponse.json(safeMonitor, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
