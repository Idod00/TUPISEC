import cron, { type ScheduledTask } from "node-cron";
import { randomUUID } from "crypto";
import { listSchedules, createScan, completeScan, failScan, updateScheduleRun, getSchedule } from "./db";
import { runScan } from "./scanner";
import { calculateScore } from "./scoring";
import type { ScheduleRecord } from "./types";

const CRON_MAP: Record<ScheduleRecord["interval"], string> = {
  daily: "0 9 * * *",
  weekly: "0 9 * * 1",
  monthly: "0 9 1 * *",
};

// Active cron tasks keyed by schedule id
const activeTasks = new Map<string, ScheduledTask>();

function computeNextRun(cronExpr: string): string {
  // Approximate: add 1 minute and let node-cron handle actual timing
  // We use a simple heuristic for display purposes
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  return now.toISOString();
}

function executeSchedule(scheduleId: string) {
  const schedule = getSchedule(scheduleId);
  if (!schedule || !schedule.enabled) return;

  const scanId = randomUUID();
  createScan(scanId, schedule.target_url);

  runScan(
    schedule.target_url,
    () => {},
    (report) => {
      const score = calculateScore(report);
      completeScan(scanId, report, score);
      const now = new Date().toISOString();
      const nextRun = computeNextRun(schedule.cron_expr);
      updateScheduleRun(scheduleId, now, nextRun);
    },
    () => {
      failScan(scanId);
    }
  );
}

export function registerSchedule(schedule: ScheduleRecord) {
  if (activeTasks.has(schedule.id)) return;
  if (!schedule.enabled) return;

  const task = cron.schedule(schedule.cron_expr, () => {
    executeSchedule(schedule.id);
  });
  activeTasks.set(schedule.id, task);
}

export function unregisterSchedule(scheduleId: string) {
  const task = activeTasks.get(scheduleId);
  if (task) {
    task.stop();
    activeTasks.delete(scheduleId);
  }
}

export function initScheduler() {
  const schedules = listSchedules();
  for (const schedule of schedules) {
    registerSchedule(schedule);
  }
}

export { CRON_MAP, computeNextRun };
