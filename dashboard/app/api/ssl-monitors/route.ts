import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { listSSLMonitors, createSSLMonitor } from "@/lib/db";
import { registerSSLMonitor, SSL_CRON_MAP } from "@/lib/ssl-scheduler";
import type { SSLMonitorRecord } from "@/lib/types";

export async function GET() {
  const monitors = listSSLMonitors();
  return NextResponse.json(monitors);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { domain, port, interval, notify_days_before, notify_email } = body;

    if (!domain || !interval) {
      return NextResponse.json({ error: "domain and interval are required" }, { status: 400 });
    }
    if (!["daily", "weekly", "monthly"].includes(interval)) {
      return NextResponse.json({ error: "interval must be daily, weekly, or monthly" }, { status: 400 });
    }

    const cronExpr = SSL_CRON_MAP[interval as SSLMonitorRecord["interval"]];
    const now = new Date().toISOString();

    const monitor = createSSLMonitor({
      id: uuidv4(),
      domain: domain.replace(/^https?:\/\//, "").split("/")[0].trim(),
      port: typeof port === "number" ? port : 443,
      interval,
      cron_expr: cronExpr,
      enabled: 1,
      created_at: now,
      notify_days_before: typeof notify_days_before === "number" ? notify_days_before : 14,
      notify_email: notify_email || null,
    });

    registerSSLMonitor(monitor);

    return NextResponse.json(monitor, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
