import { NextResponse } from "next/server";
import { listSettings, getSetting } from "@/lib/db";
import { setSecureSetting } from "@/lib/secure-settings";
import { ENCRYPTED_KEYS } from "@/lib/crypto";

const ALLOWED_KEYS = [
  "virustotal_api_key",
  "shodan_api_key",
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_pass",
  "smtp_from",
  "smtp_secure",
];

const NON_SECRET_KEYS = ["smtp_host", "smtp_port", "smtp_from", "smtp_secure", "smtp_user"];

export async function GET() {
  const settings = listSettings();
  const result = settings
    .filter((s) => ALLOWED_KEYS.includes(s.key))
    .map((s) => ({
      key: s.key,
      value: NON_SECRET_KEYS.includes(s.key) ? s.value : undefined,
      set: !!s.value,
      updated_at: s.updated_at,
    }));
  return NextResponse.json(result);
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const updates = body as Record<string, string>;

    for (const [key, value] of Object.entries(updates)) {
      if (!ALLOWED_KEYS.includes(key)) continue;
      if (typeof value !== "string") continue;
      if (value.trim() === "" && key !== "smtp_secure") continue;
      setSecureSetting(key, value.trim());
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
