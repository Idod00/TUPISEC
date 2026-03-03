import { getSetting } from "./db";
import { getSecureSetting } from "./secure-settings";
import type { SSLMonitorRecord, SSLCheckResult } from "./types";

async function getTransporter() {
  const nodemailer = await import("nodemailer");
  const host = await getSetting("smtp_host");
  if (!host) throw new Error("SMTP not configured. Set smtp_host in Settings.");

  const port = parseInt((await getSetting("smtp_port")) ?? "587", 10);
  const secure = (await getSetting("smtp_secure")) === "true";
  const user = (await getSetting("smtp_user")) ?? "";
  const pass = (await getSecureSetting("smtp_pass")) ?? "";

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
    tls: { rejectUnauthorized: false },
  });
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const transporter = await getTransporter();
  const from = (await getSetting("smtp_from")) ?? "TupiSec <noreply@tupisec.io>";
  await transporter.sendMail({ from, to, subject, html });
}

export async function sendSSLAlertEmail(
  monitor: SSLMonitorRecord,
  result: SSLCheckResult,
  status: "warning" | "error"
): Promise<void> {
  if (!monitor.notify_email) return;

  const isWarning = status === "warning";
  const headerBg = isWarning
    ? "linear-gradient(135deg,#d97706,#b45309)"
    : "linear-gradient(135deg,#dc2626,#b91c1c)";
  const accentColor = isWarning ? "#d97706" : "#dc2626";
  const accentBg   = isWarning ? "#fffbeb" : "#fef2f2";
  const accentBorder = isWarning ? "#fde68a" : "#fecaca";
  const statusLabel = isWarning ? "ADVERTENCIA" : "ERROR";
  const statusTitle = isWarning ? "Certificado por Vencer" : "Error de Certificado";

  const daysText = result.days_remaining !== null
    ? result.days_remaining < 0
      ? `Vencido hace ${Math.abs(result.days_remaining)} dias`
      : `${result.days_remaining} dias restantes`
    : "Desconocido";

  const expiresText = result.valid_to
    ? new Date(result.valid_to).toLocaleDateString("es-PY", { year: "numeric", month: "long", day: "numeric" })
    : "Desconocido";

  const checkedAt = new Date(result.checked_at).toLocaleString("es-PY", { dateStyle: "full", timeStyle: "medium" });
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

      <!-- Header -->
      <tr>
        <td style="background:${headerBg};padding:32px 36px;text-align:center;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding-bottom:12px;">
                <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,0.15);border:3px solid rgba(255,255,255,0.4);text-align:center;line-height:52px;">
                  <span style="font-size:22px;font-weight:900;color:#ffffff;font-family:Georgia,serif;">SSL</span>
                </div>
              </td>
            </tr>
            <tr>
              <td align="center">
                <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:2px;text-transform:uppercase;">TupiSec SSL Monitor</p>
                <h1 style="margin:6px 0 0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">${statusTitle}</h1>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Dominio -->
      <tr>
        <td style="background:${accentBg};padding:20px 36px;border-bottom:1px solid ${accentBorder};">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Dominio</p>
                <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#1e293b;font-family:Courier New,monospace;">${monitor.domain}</p>
              </td>
              <td align="right" valign="middle">
                <span style="display:inline-block;background:${accentColor};color:#ffffff;font-size:12px;font-weight:700;padding:6px 16px;border-radius:99px;letter-spacing:1px;">${statusLabel}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Detalles del certificado -->
      <tr>
        <td style="padding:28px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            <tr style="background:#f8fafc;">
              <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;width:140px;border-bottom:1px solid #e2e8f0;">Dias Restantes</td>
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:${accentColor};border-bottom:1px solid #e2e8f0;">${daysText}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e2e8f0;">Vence</td>
              <td style="padding:12px 16px;font-size:13px;color:#0f172a;border-bottom:1px solid #e2e8f0;">${expiresText}</td>
            </tr>
            <tr style="background:#f8fafc;">
              <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e2e8f0;">Emisor</td>
              <td style="padding:12px 16px;font-size:13px;color:#0f172a;border-bottom:1px solid #e2e8f0;">${result.issuer?.O ?? result.issuer?.CN ?? "Desconocido"}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;${result.error ? "border-bottom:1px solid #e2e8f0;" : ""}">Protocolo</td>
              <td style="padding:12px 16px;font-size:13px;color:#0f172a;font-family:Courier New,monospace;${result.error ? "border-bottom:1px solid #e2e8f0;" : ""}">${result.protocol ?? "—"}</td>
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
          <a href="${baseUrl}/ssl" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;letter-spacing:0.3px;">Ver Monitor SSL</a>
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

  const subject = `[TupiSec] SSL ${isWarning ? "Advertencia" : "Error"}: ${monitor.domain} &mdash; ${isWarning ? "Certificado por vencer" : "Error de certificado"}`;
  await sendEmail(monitor.notify_email, subject, html);
}
