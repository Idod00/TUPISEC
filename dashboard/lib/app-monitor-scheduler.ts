import cron, { type ScheduledTask } from "node-cron";
import { randomUUID } from "crypto";
import {
  listAppMonitors,
  getAppMonitor,
  updateAppMonitorAfterCheck,
  saveAppCheckHistory,
  listNotificationConfigs,
} from "./db";
import { checkApp, checkAvailability } from "./app-checker";
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

export function computeNextRun(interval: AppMonitorInterval): string {
  const now = new Date();
  const next = new Date(now);
  switch (interval) {
    case "5min":
      next.setMinutes(Math.ceil((now.getMinutes() + 1) / 5) * 5, 0, 0);
      break;
    case "15min":
      next.setMinutes(Math.ceil((now.getMinutes() + 1) / 15) * 15, 0, 0);
      break;
    case "30min":
      next.setMinutes(Math.ceil((now.getMinutes() + 1) / 30) * 30, 0, 0);
      break;
    case "1h":
      next.setHours(now.getHours() + 1, 0, 0, 0);
      break;
    case "6h":
      next.setHours(Math.ceil((now.getHours() + 1) / 6) * 6, 0, 0, 0);
      break;
    case "1d":
      next.setDate(now.getDate() + 1);
      next.setHours(9, 0, 0, 0);
      break;
    default:
      next.setMinutes(now.getMinutes() + 15, 0, 0);
  }
  return next.toISOString();
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

  const configs = await listNotificationConfigs();
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
    const subject = `[TupiSec] ALERTA: ${monitor.name} esta CAIDO`;
    const checkedAt = new Date(result.checked_at).toLocaleString("es-PY", { dateStyle: "full", timeStyle: "medium" });
    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

      <!-- Header rojo -->
      <tr>
        <td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px 36px;text-align:center;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding-bottom:12px;">
                <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,0.15);border:3px solid rgba(255,255,255,0.4);text-align:center;line-height:56px;">
                  <span style="font-size:26px;font-weight:900;color:#ffffff;font-family:Georgia,serif;">!</span>
                </div>
              </td>
            </tr>
            <tr>
              <td align="center">
                <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:2px;text-transform:uppercase;">TupiSec Monitor</p>
                <h1 style="margin:6px 0 0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Servicio Caido</h1>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Nombre del monitor -->
      <tr>
        <td style="background:#fef2f2;padding:20px 36px;border-bottom:1px solid #fecaca;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Monitor</p>
                <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#1e293b;">${monitor.name}</p>
              </td>
              <td align="right" valign="middle">
                <span style="display:inline-block;background:#dc2626;color:#ffffff;font-size:12px;font-weight:700;padding:6px 16px;border-radius:99px;letter-spacing:1px;">DOWN</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Detalles -->
      <tr>
        <td style="padding:28px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            <tr style="background:#f8fafc;">
              <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;width:130px;border-bottom:1px solid #e2e8f0;">URL</td>
              <td style="padding:12px 16px;font-size:13px;color:#0f172a;font-family:Courier New,monospace;border-bottom:1px solid #e2e8f0;word-break:break-all;">${monitor.url}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e2e8f0;">Respuesta</td>
              <td style="padding:12px 16px;font-size:13px;color:#0f172a;border-bottom:1px solid #e2e8f0;">${result.response_ms} ms</td>
            </tr>
            ${result.error ? `
            <tr style="background:#fef2f2;">
              <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:1px;">Error</td>
              <td style="padding:12px 16px;font-size:13px;color:#dc2626;font-family:Courier New,monospace;">${result.error}</td>
            </tr>` : ""}
          </table>
        </td>
      </tr>

      <!-- Boton -->
      <tr>
        <td style="padding:0 36px 28px;text-align:center;">
          <a href="${baseUrl}/monitors" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;letter-spacing:0.3px;">Ver todos los monitores</a>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">Revisado: ${checkedAt}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1;">TupiSec Security Dashboard &mdash; Alerta automatica</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
    console.log(`[app-scheduler] Sending alert email to ${monitor.notify_email}...`);
    await sendEmail(monitor.notify_email, subject, html)
      .then(() => console.log(`[app-scheduler] Alert email sent OK to ${monitor.notify_email}`))
      .catch((err) => console.error(`[app-scheduler] Email to ${monitor.notify_email} FAILED:`, err));
  }
}

async function executeAppCheck(monitorId: string): Promise<void> {
  const monitor = await getAppMonitor(monitorId);
  if (!monitor || !monitor.enabled) return;

  console.log(`[app-scheduler] Checking ${monitor.name} (${monitor.url})...`);

  let password: string;
  try {
    password = decryptValue(monitor.password_enc);
  } catch {
    password = monitor.password_enc;
  }

  const now = new Date().toISOString();
  const nextRun = computeNextRun(monitor.interval as AppMonitorInterval);
  const RENOTIFY_MS = 24 * 60 * 60 * 1000; // re-notify if still down after 24h

  // ── Check 1: Availability (GET) ──
  const availResult = await checkAvailability(monitor.url);
  await saveAppCheckHistory(
    randomUUID(), monitorId, availResult.checked_at,
    availResult.status, availResult.response_ms,
    availResult.status_code ?? null, availResult.error ?? null,
    "availability", availResult.response_detail ?? null
  );

  const isAvailabilityOnly = monitor.monitor_type === "availability";

  let overallStatus: "up" | "down";
  let loginStatusValue: "up" | "down" | null = null;

  if (isAvailabilityOnly) {
    // Availability-only: no login check
    overallStatus = availResult.status;
    console.log(
      `[app-scheduler] ${monitor.name} → availability:${availResult.status} (${availResult.response_ms}ms)`
    );
  } else {
    // ── Check 2: Login (POST) ──
    let loginResult: AppCheckResult;
    if (availResult.status === "up") {
      loginResult = await checkApp(monitor.url, monitor.username, password);
    } else {
      loginResult = {
        url: monitor.url,
        checked_at: new Date().toISOString(),
        status: "down",
        response_ms: 0,
        status_code: null,
        error: "Skipped — site not reachable",
        response_detail: "Skipped — site not reachable",
      };
    }
    await saveAppCheckHistory(
      randomUUID(), monitorId, loginResult.checked_at,
      loginResult.status, loginResult.response_ms,
      loginResult.status_code ?? null, loginResult.error ?? null,
      "login", loginResult.response_detail ?? null
    );
    loginStatusValue = loginResult.status;
    overallStatus = availResult.status === "up" && loginResult.status === "up" ? "up" : "down";
    console.log(
      `[app-scheduler] ${monitor.name} → availability:${availResult.status} login:${loginResult.status} (${availResult.response_ms}ms)`
    );
  }

  // ── Notification logic ──
  // Notify on: first transition to down, never-notified while down, or re-notify after 24h
  const lastNotifiedMs = monitor.last_notified_at ? new Date(monitor.last_notified_at).getTime() : null;
  const shouldNotify =
    overallStatus === "down" && (
      monitor.last_status !== "down" ||
      lastNotifiedMs === null ||
      Date.now() - lastNotifiedMs >= RENOTIFY_MS
    );

  const newLastNotifiedAt = shouldNotify ? now : (overallStatus === "up" ? null : (monitor.last_notified_at ?? null));

  await updateAppMonitorAfterCheck(
    monitorId, overallStatus, availResult.response_ms, now, nextRun, loginStatusValue, newLastNotifiedAt
  );

  if (shouldNotify) {
    const notifyResult = isAvailabilityOnly
      ? availResult
      : (availResult.status === "down" ? availResult : loginStatusValue === "down" ? { url: monitor.url, checked_at: now, status: "down" as const, response_ms: 0, status_code: null, error: "Login failed" } : availResult);
    dispatchAppNotifications(monitor, notifyResult).catch((err) =>
      console.error("[app-scheduler] Notification dispatch failed:", err)
    );
  }
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

export async function initAppMonitorScheduler(): Promise<void> {
  const monitors = await listAppMonitors();
  for (const monitor of monitors) {
    registerAppMonitor(monitor);
  }
  console.log(`[app-scheduler] Initialized ${monitors.length} app monitors`);
}

export { executeAppCheck };
