import cron, { type ScheduledTask } from "node-cron";
import { randomUUID } from "crypto";
import {
  listSSLMonitors,
  getSSLMonitor,
  updateSSLMonitorAfterCheck,
  saveSSLCheckHistory,
} from "./db";
import { checkSSL, getSSLStatus } from "./ssl-checker";
import { listNotificationConfigs } from "./db";
import { sendSSLAlertEmail } from "./mailer";
import type { SSLMonitorRecord, SSLCheckResult } from "./types";

export const SSL_CRON_MAP: Record<SSLMonitorRecord["interval"], string> = {
  daily: "0 8 * * *",
  weekly: "0 8 * * 1",
  monthly: "0 8 1 * *",
};

const activeSSLTasks = new Map<string, ScheduledTask>();

function computeNextRun(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  return now.toISOString();
}

async function dispatchSSLNotifications(
  monitor: SSLMonitorRecord,
  result: SSLCheckResult,
  status: "warning" | "error"
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const payload = {
    event: "ssl.alert",
    domain: monitor.domain,
    port: monitor.port,
    status,
    days_remaining: result.days_remaining,
    valid_to: result.valid_to,
    issuer: result.issuer?.O ?? result.issuer?.CN ?? "Unknown",
    protocol: result.protocol,
    chain_valid: result.chain_valid,
    error: result.error ?? null,
    monitor_url: `${baseUrl}/ssl`,
    timestamp: new Date().toISOString(),
  };

  // Dispatch to all enabled webhook/slack configs
  const configs = listNotificationConfigs();
  const webhookPromises = configs
    .filter((c) => c.enabled)
    .map((c) => {
      let body: unknown = payload;
      if (c.type === "slack") {
        const statusEmoji = status === "warning" ? "⚠️" : "🔴";
        const daysText =
          result.days_remaining !== null
            ? `${result.days_remaining} days remaining`
            : "Unknown";
        body = {
          text: `TupiSec SSL Alert: ${monitor.domain}`,
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: `${statusEmoji} TupiSec SSL Alert`,
              },
            },
            {
              type: "section",
              fields: [
                { type: "mrkdwn", text: `*Domain:*\n${monitor.domain}` },
                { type: "mrkdwn", text: `*Status:*\n${status.toUpperCase()}` },
                { type: "mrkdwn", text: `*Expiry:*\n${daysText}` },
                {
                  type: "mrkdwn",
                  text: `*Issuer:*\n${result.issuer?.O ?? result.issuer?.CN ?? "Unknown"}`,
                },
              ],
            },
            ...(result.error
              ? [
                  {
                    type: "section",
                    text: { type: "mrkdwn", text: `*Error:* ${result.error}` },
                  },
                ]
              : []),
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: { type: "plain_text", text: "View SSL Monitor" },
                  url: `${baseUrl}/ssl`,
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
        console.error(`[ssl-scheduler] Webhook "${c.name}" failed:`, err);
      });
    });

  await Promise.allSettled(webhookPromises);

  // Email notification
  if (monitor.notify_email) {
    await sendSSLAlertEmail(monitor, result, status).catch((err) => {
      console.error(`[ssl-scheduler] Email to ${monitor.notify_email} failed:`, err);
    });
  }
}

async function executeSSLCheck(monitorId: string): Promise<void> {
  const monitor = getSSLMonitor(monitorId);
  if (!monitor || !monitor.enabled) return;

  console.log(`[ssl-scheduler] Checking SSL for ${monitor.domain}...`);
  const result = await checkSSL(monitor.domain, monitor.port);
  const status = getSSLStatus(result, monitor.notify_days_before);

  const checkId = randomUUID();
  saveSSLCheckHistory(checkId, monitorId, status, result.days_remaining, result);

  const now = new Date().toISOString();
  const nextRun = computeNextRun();
  updateSSLMonitorAfterCheck(monitorId, status, result.days_remaining, now, nextRun);

  if (status !== "ok") {
    dispatchSSLNotifications(monitor, result, status as "warning" | "error").catch(
      (err) => console.error("[ssl-scheduler] Notification dispatch failed:", err)
    );
  }

  console.log(
    `[ssl-scheduler] ${monitor.domain} → ${status} (${result.days_remaining ?? "?"} days)`
  );
}

export function registerSSLMonitor(monitor: SSLMonitorRecord): void {
  if (activeSSLTasks.has(monitor.id)) return;
  if (!monitor.enabled) return;

  const task = cron.schedule(monitor.cron_expr, () => {
    executeSSLCheck(monitor.id);
  });
  activeSSLTasks.set(monitor.id, task);
}

export function unregisterSSLMonitor(monitorId: string): void {
  const task = activeSSLTasks.get(monitorId);
  if (task) {
    task.stop();
    activeSSLTasks.delete(monitorId);
  }
}

export function initSSLScheduler(): void {
  const monitors = listSSLMonitors();
  for (const monitor of monitors) {
    registerSSLMonitor(monitor);
  }
  console.log(`[ssl-scheduler] Initialized ${monitors.length} SSL monitors`);
}

export { executeSSLCheck };
