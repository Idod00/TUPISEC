import cron, { type ScheduledTask } from "node-cron";
import { randomUUID } from "crypto";
import {
  listAppMonitors,
  getAppMonitor,
  updateAppMonitorAfterCheck,
  saveAppCheckHistory,
  listNotificationConfigs,
} from "./db";
import { checkApp } from "./app-checker";
import { decryptValue } from "./crypto";
import { sendEmail } from "./mailer";
import type { AppMonitorRecord, AppCheckResult, AppMonitorInterval } from "./types";

export const APP_CRON_MAP: Record<AppMonitorInterval, string> = {
  "5min":  "*/5 * * * *",
  "15min": "*/15 * * * *",
  "30min": "*/30 * * * *",
  "1h":    "0 * * * *",
  "6h":    "0 */6 * * *",
  "1d":    "0 9 * * *",
};

const activeAppTasks = new Map<string, ScheduledTask>();

function computeNextRun(cronExpr: string): string {
  // Approximate next run as now + 1 min (cron library doesn't expose next tick)
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  return now.toISOString();
}

async function dispatchAppNotifications(
  monitor: AppMonitorRecord,
  result: AppCheckResult
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const payload = {
    event: "app.down",
    name: monitor.name,
    url: monitor.url,
    status: "down",
    response_ms: result.response_ms,
    error: result.error ?? null,
    monitor_url: `${baseUrl}/monitors`,
    timestamp: new Date().toISOString(),
  };

  const configs = listNotificationConfigs();
  const webhookPromises = configs
    .filter((c) => c.enabled)
    .map((c) => {
      let body: unknown = payload;
      if (c.type === "slack") {
        body = {
          text: `TupiSec App Monitor: ${monitor.name} is DOWN`,
          blocks: [
            {
              type: "header",
              text: { type: "plain_text", text: "🔴 TupiSec App Monitor Alert" },
            },
            {
              type: "section",
              fields: [
                { type: "mrkdwn", text: `*App:*\n${monitor.name}` },
                { type: "mrkdwn", text: `*Status:*\nDOWN` },
                { type: "mrkdwn", text: `*URL:*\n${monitor.url}` },
                { type: "mrkdwn", text: `*Response:*\n${result.response_ms}ms` },
              ],
            },
            ...(result.error
              ? [{ type: "section", text: { type: "mrkdwn", text: `*Error:* ${result.error}` } }]
              : []),
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: { type: "plain_text", text: "View Monitors" },
                  url: `${baseUrl}/monitors`,
                },
              ],
            },
          ],
        };
      }
      return fetch(c.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      }).catch((err) => {
        console.error(`[app-scheduler] Webhook "${c.name}" failed:`, err);
      });
    });

  await Promise.allSettled(webhookPromises);

  if (monitor.notify_email) {
    const subject = `[TupiSec] App Down: ${monitor.name}`;
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:32px;">
  <div style="max-width:520px;margin:0 auto;background:#1e293b;border-radius:12px;padding:32px;border:1px solid #334155;">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
      <span style="font-size:32px;">🔴</span>
      <div>
        <h1 style="margin:0;font-size:20px;color:#f8fafc;">TupiSec App Monitor</h1>
        <span style="display:inline-block;background:#ef444420;color:#ef4444;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:600;">DOWN</span>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr>
        <td style="padding:8px 0;color:#94a3b8;font-size:13px;width:140px;">App</td>
        <td style="padding:8px 0;font-weight:600;">${monitor.name}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#94a3b8;font-size:13px;">URL</td>
        <td style="padding:8px 0;font-family:monospace;">${monitor.url}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#94a3b8;font-size:13px;">Response</td>
        <td style="padding:8px 0;">${result.response_ms}ms</td>
      </tr>
      ${result.error ? `<tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;">Error</td><td style="padding:8px 0;color:#ef4444;">${result.error}</td></tr>` : ""}
    </table>
    <p style="color:#64748b;font-size:12px;margin:0;">
      Checked at: ${new Date(result.checked_at).toLocaleString()}<br>
      View all monitors: <a href="${baseUrl}/monitors" style="color:#6366f1;">${baseUrl}/monitors</a>
    </p>
  </div>
</body>
</html>`;
    await sendEmail(monitor.notify_email, subject, html).catch((err) => {
      console.error(`[app-scheduler] Email to ${monitor.notify_email} failed:`, err);
    });
  }
}

async function executeAppCheck(monitorId: string): Promise<void> {
  const monitor = getAppMonitor(monitorId);
  if (!monitor || !monitor.enabled) return;

  console.log(`[app-scheduler] Checking ${monitor.name} (${monitor.url})...`);

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
    monitorId,
    result.checked_at,
    result.status,
    result.response_ms,
    result.status_code ?? null,
    result.error ?? null
  );

  const now = new Date().toISOString();
  const nextRun = computeNextRun(monitor.cron_expr);
  updateAppMonitorAfterCheck(monitorId, result.status, result.response_ms, now, nextRun);

  // Notify only on status change to down (or first down)
  if (result.status === "down" && monitor.last_status !== "down") {
    dispatchAppNotifications(monitor, result).catch((err) =>
      console.error("[app-scheduler] Notification dispatch failed:", err)
    );
  }

  console.log(
    `[app-scheduler] ${monitor.name} → ${result.status} (${result.response_ms}ms)`
  );
}

export function registerAppMonitor(monitor: AppMonitorRecord): void {
  if (activeAppTasks.has(monitor.id)) return;
  if (!monitor.enabled) return;

  const task = cron.schedule(monitor.cron_expr, () => {
    executeAppCheck(monitor.id);
  });
  activeAppTasks.set(monitor.id, task);
}

export function unregisterAppMonitor(id: string): void {
  const task = activeAppTasks.get(id);
  if (task) {
    task.stop();
    activeAppTasks.delete(id);
  }
}

export function initAppMonitorScheduler(): void {
  const monitors = listAppMonitors();
  for (const monitor of monitors) {
    registerAppMonitor(monitor);
  }
  console.log(`[app-scheduler] Initialized ${monitors.length} app monitors`);
}

export { executeAppCheck };
