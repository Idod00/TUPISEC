import { getSetting } from "./db";
import type { SSLMonitorRecord, SSLCheckResult } from "./types";

async function getTransporter() {
  const nodemailer = await import("nodemailer");
  const host = getSetting("smtp_host");
  if (!host) throw new Error("SMTP not configured. Set smtp_host in Settings.");

  const port = parseInt(getSetting("smtp_port") ?? "587", 10);
  const secure = getSetting("smtp_secure") === "true";
  const user = getSetting("smtp_user") ?? "";
  const pass = getSetting("smtp_pass") ?? "";

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  });
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const transporter = await getTransporter();
  const from = getSetting("smtp_from") ?? "TupiSec <noreply@tupisec.io>";
  await transporter.sendMail({ from, to, subject, html });
}

export async function sendSSLAlertEmail(
  monitor: SSLMonitorRecord,
  result: SSLCheckResult,
  status: "warning" | "error"
): Promise<void> {
  if (!monitor.notify_email) return;

  const statusLabel = status === "warning" ? "⚠️ Warning" : "🔴 Error";
  const statusColor = status === "warning" ? "#f59e0b" : "#ef4444";
  const daysText =
    result.days_remaining !== null
      ? result.days_remaining < 0
        ? `<strong style="color:#ef4444">Expired ${Math.abs(result.days_remaining)} days ago</strong>`
        : `<strong style="color:${statusColor}">${result.days_remaining} days remaining</strong>`
      : "Unknown";

  const expiresText = result.valid_to
    ? new Date(result.valid_to).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:32px;">
  <div style="max-width:520px;margin:0 auto;background:#1e293b;border-radius:12px;padding:32px;border:1px solid #334155;">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
      <span style="font-size:32px;">🔒</span>
      <div>
        <h1 style="margin:0;font-size:20px;color:#f8fafc;">TupiSec SSL Alert</h1>
        <span style="display:inline-block;background:${statusColor}20;color:${statusColor};padding:2px 10px;border-radius:99px;font-size:12px;font-weight:600;">${statusLabel}</span>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr>
        <td style="padding:8px 0;color:#94a3b8;font-size:13px;width:140px;">Domain</td>
        <td style="padding:8px 0;font-weight:600;font-family:monospace;">${monitor.domain}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#94a3b8;font-size:13px;">Days Remaining</td>
        <td style="padding:8px 0;">${daysText}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#94a3b8;font-size:13px;">Expires</td>
        <td style="padding:8px 0;">${expiresText}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#94a3b8;font-size:13px;">Issuer</td>
        <td style="padding:8px 0;">${result.issuer?.O ?? result.issuer?.CN ?? "Unknown"}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#94a3b8;font-size:13px;">Protocol</td>
        <td style="padding:8px 0;font-family:monospace;">${result.protocol}</td>
      </tr>
      ${result.error ? `<tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;">Error</td><td style="padding:8px 0;color:#ef4444;">${result.error}</td></tr>` : ""}
    </table>

    <p style="color:#64748b;font-size:12px;margin:0;">
      This alert was sent by TupiSec SSL Certificate Monitor.<br>
      Checked at: ${new Date(result.checked_at).toLocaleString()}
    </p>
  </div>
</body>
</html>`;

  const subject = `[TupiSec] SSL Alert: ${monitor.domain} — ${status === "warning" ? "Expiring Soon" : "Certificate Error"}`;
  await sendEmail(monitor.notify_email, subject, html);
}
