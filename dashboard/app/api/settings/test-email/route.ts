import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/mailer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to } = body;
    if (!to || typeof to !== "string") {
      return NextResponse.json({ error: "Recipient email address is required" }, { status: 400 });
    }

    await sendEmail(
      to,
      "[TupiSec] Test Email — SMTP Configuration Working",
      `<div style="font-family:sans-serif;padding:24px;">
        <h2>TupiSec SMTP Test</h2>
        <p>If you received this email, your SMTP configuration is working correctly.</p>
        <p style="color:#64748b;font-size:13px;">Sent at: ${new Date().toLocaleString()}</p>
      </div>`
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 502 });
  }
}
