import cron, { type ScheduledTask } from "node-cron";
import { randomUUID } from "crypto";
import { listSchedules, createScan, completeScan, failScan, updateScheduleRun, getSchedule, getSetting } from "./db";
import { runScan } from "./scanner";
import { calculateScore } from "./scoring";
import { dispatchNotifications } from "./notifications";
import { enrichScan } from "./enrichment";
import { sendEmail } from "./mailer";
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
      dispatchNotifications(scanId, schedule.target_url, score, report).catch(() => {});
      enrichScan(scanId).catch(() => {});

      // Send email notification if configured
      if (schedule.notify_email) {
        const grade = (() => {
          const s = score;
          if (s >= 90) return "A"; if (s >= 75) return "B"; if (s >= 60) return "C";
          if (s >= 45) return "D"; if (s >= 25) return "F"; return "F";
        })();
        const baseUrl = getSetting("app_base_url") || "http://localhost:3000";
        sendEmail(
          schedule.notify_email,
          `[TupiSec] Scheduled scan complete — ${schedule.target_url}`,
          `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:32px;">
          <div style="max-width:520px;margin:0 auto;background:#1e293b;border-radius:12px;padding:32px;border:1px solid #334155;">
            <h2 style="margin:0 0 16px;font-size:18px;">&#x1F6E1;&#xFE0F; Scheduled Scan Complete</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;width:120px;">Target</td>
                  <td style="padding:6px 0;font-family:monospace;font-size:13px;">${schedule.target_url}</td></tr>
              <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;">Risk Score</td>
                  <td style="padding:6px 0;font-weight:bold;">${grade} (${score})</td></tr>
              <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;">Findings</td>
                  <td style="padding:6px 0;">${report.findings.length} total</td></tr>
            </table>
            <a href="${baseUrl}/scan/${scanId}" style="display:inline-block;margin-top:20px;padding:8px 20px;background:#22c55e;color:#000;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;">View Report</a>
          </div></body></html>`
        ).catch(() => {});
      }
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
