import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/mailer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to } = body;
    if (!to || typeof to !== "string") {
      return NextResponse.json({ error: "Recipient email address is required" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const now = new Date();
    const checkedAt = now.toLocaleString("es-PY", { dateStyle: "full", timeStyle: "medium" });

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
                <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#1e293b;">MI-APLICACION (Ejemplo)</p>
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
              <td style="padding:12px 16px;font-size:13px;color:#0f172a;font-family:Courier New,monospace;border-bottom:1px solid #e2e8f0;">https://mi-aplicacion.ejemplo.com</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e2e8f0;">Respuesta</td>
              <td style="padding:12px 16px;font-size:13px;color:#0f172a;border-bottom:1px solid #e2e8f0;">3241 ms</td>
            </tr>
            <tr style="background:#fef2f2;">
              <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:1px;">Error</td>
              <td style="padding:12px 16px;font-size:13px;color:#dc2626;font-family:Courier New,monospace;">fetch failed</td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Boton -->
      <tr>
        <td style="padding:0 36px 28px;text-align:center;">
          <a href="${baseUrl}/monitors" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;letter-spacing:0.3px;">Ver todos los monitores</a>
        </td>
      </tr>

      <!-- Separador SSL -->
      <tr>
        <td style="padding:0 36px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="border-top:2px dashed #e2e8f0;padding-top:20px;text-align:center;">
                <p style="margin:0;font-size:11px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">Vista previa — Alerta SSL</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Header SSL amber -->
      <tr>
        <td style="background:linear-gradient(135deg,#d97706,#b45309);padding:24px 36px;text-align:center;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding-bottom:10px;">
                <div style="display:inline-block;width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.15);border:3px solid rgba(255,255,255,0.4);text-align:center;line-height:44px;">
                  <span style="font-size:14px;font-weight:900;color:#ffffff;font-family:Georgia,serif;">SSL</span>
                </div>
              </td>
            </tr>
            <tr>
              <td align="center">
                <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.75);letter-spacing:2px;text-transform:uppercase;">TupiSec SSL Monitor</p>
                <h2 style="margin:4px 0 0;font-size:22px;font-weight:700;color:#ffffff;">Certificado por Vencer</h2>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Dominio SSL -->
      <tr>
        <td style="background:#fffbeb;padding:18px 36px;border-bottom:1px solid #fde68a;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Dominio</p>
                <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#1e293b;font-family:Courier New,monospace;">ejemplo.tupisa.com.py</p>
              </td>
              <td align="right" valign="middle">
                <span style="display:inline-block;background:#d97706;color:#ffffff;font-size:12px;font-weight:700;padding:5px 14px;border-radius:99px;letter-spacing:1px;">ADVERTENCIA</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Detalles SSL -->
      <tr>
        <td style="padding:20px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            <tr style="background:#f8fafc;">
              <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;width:140px;border-bottom:1px solid #e2e8f0;">Dias Restantes</td>
              <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#d97706;border-bottom:1px solid #e2e8f0;">12 dias restantes</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e2e8f0;">Vence</td>
              <td style="padding:10px 16px;font-size:13px;color:#0f172a;border-bottom:1px solid #e2e8f0;">15 de marzo de 2026</td>
            </tr>
            <tr style="background:#f8fafc;">
              <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e2e8f0;">Emisor</td>
              <td style="padding:10px 16px;font-size:13px;color:#0f172a;border-bottom:1px solid #e2e8f0;">Let's Encrypt</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Protocolo</td>
              <td style="padding:10px 16px;font-size:13px;color:#0f172a;font-family:Courier New,monospace;">TLSv1.3</td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Boton SSL -->
      <tr>
        <td style="padding:0 36px 28px;text-align:center;">
          <a href="${baseUrl}/ssl" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;letter-spacing:0.3px;">Ver Monitor SSL</a>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">Revisado: ${checkedAt}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1;">TupiSec Security Dashboard &mdash; Email de prueba</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

    await sendEmail(to, "[TupiSec] Vista previa — Nuevo diseno de alertas", html);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 502 });
  }
}
