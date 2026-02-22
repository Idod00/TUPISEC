import { listNotificationConfigs } from "./db";
import type { ScanReport, NotificationConfig } from "./types";

function getRiskGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function buildSlackPayload(scanId: string, targetUrl: string, riskScore: number, report: ScanReport) {
  const summary = report.summary || {};
  const critical = summary.CRITICAL || 0;
  const high = summary.HIGH || 0;
  const medium = summary.MEDIUM || 0;
  const total = report.findings.length;
  const grade = getRiskGrade(riskScore);
  const domain = new URL(targetUrl).hostname;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  return {
    text: `TupiSec: Scan complete — ${domain}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "TupiSec Scan Complete" },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Target:*\n${domain}` },
          { type: "mrkdwn", text: `*Grade:*\n${grade} (${riskScore})` },
          {
            type: "mrkdwn",
            text: `*Critical:* ${critical}   *High:* ${high}   *Medium:* ${medium}   *Total:* ${total}`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "View Report" },
            url: `${baseUrl}/scan/${scanId}`,
          },
        ],
      },
    ],
  };
}

function buildWebhookPayload(scanId: string, targetUrl: string, riskScore: number, report: ScanReport) {
  const summary = report.summary || {};
  return {
    event: "scan.completed",
    scan_id: scanId,
    target_url: targetUrl,
    risk_score: riskScore,
    risk_grade: getRiskGrade(riskScore),
    critical: summary.CRITICAL || 0,
    high: summary.HIGH || 0,
    medium: summary.MEDIUM || 0,
    low: summary.LOW || 0,
    info: summary.INFO || 0,
    total_findings: report.findings.length,
    timestamp: new Date().toISOString(),
  };
}

async function dispatchToConfig(
  config: NotificationConfig,
  scanId: string,
  targetUrl: string,
  riskScore: number,
  report: ScanReport
): Promise<void> {
  const payload =
    config.type === "slack"
      ? buildSlackPayload(scanId, targetUrl, riskScore, report)
      : buildWebhookPayload(scanId, targetUrl, riskScore, report);

  await fetch(config.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
}

export async function dispatchNotifications(
  scanId: string,
  targetUrl: string,
  riskScore: number,
  report: ScanReport
): Promise<void> {
  const configs = listNotificationConfigs();
  const summary = report.summary || {};
  const hasCritical = (summary.CRITICAL || 0) > 0;

  const promises = configs
    .filter((c) => {
      if (!c.enabled) return false;
      const shouldNotify = c.notify_on_complete || (c.notify_on_critical && hasCritical);
      if (!shouldNotify) return false;
      if (riskScore > c.min_risk_score) return false;
      return true;
    })
    .map((c) =>
      dispatchToConfig(c, scanId, targetUrl, riskScore, report).catch((err) => {
        console.error(`[notifications] Failed to dispatch to "${c.name}":`, err);
      })
    );

  await Promise.allSettled(promises);
}

export async function testNotification(configId: string): Promise<{ ok: boolean; error?: string }> {
  const configs = listNotificationConfigs();
  const config = configs.find((c) => c.id === configId);
  if (!config) return { ok: false, error: "Config not found" };

  const testReport: ScanReport = {
    target: "https://test.tupisec.io",
    base_url: "https://test.tupisec.io",
    scan_date: new Date().toISOString(),
    summary: { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 1, INFO: 4 },
    tech_stack: {},
    discovered_urls: [],
    findings: [],
  };

  try {
    await dispatchToConfig(config, "test-scan-id", "https://test.tupisec.io", 72, testReport);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
