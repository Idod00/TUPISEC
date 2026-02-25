import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { listSchedules, createSchedule } from "@/lib/db";
import { registerSchedule, CRON_MAP, computeNextRun } from "@/lib/scheduler";
import type { ScheduleRecord } from "@/lib/types";

export async function GET() {
  const schedules = await listSchedules();
  return NextResponse.json(schedules);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { target_url, interval, notify_email } = body as { target_url: string; interval: ScheduleRecord["interval"]; notify_email?: string };

  if (!target_url || !interval) {
    return NextResponse.json({ error: "target_url and interval are required" }, { status: 400 });
  }
  if (!["daily", "weekly", "monthly"].includes(interval)) {
    return NextResponse.json({ error: "interval must be daily, weekly, or monthly" }, { status: 400 });
  }

  const cronExpr = CRON_MAP[interval];
  const nextRun = computeNextRun(cronExpr);
  const id = randomUUID();

  const schedule = await createSchedule(id, target_url, interval, cronExpr, nextRun, notify_email || undefined);
  registerSchedule(schedule);

  return NextResponse.json(schedule, { status: 201 });
}
