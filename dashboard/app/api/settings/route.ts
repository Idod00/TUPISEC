import { NextResponse } from "next/server";
import { listSettings, setSetting } from "@/lib/db";

const ALLOWED_KEYS = ["virustotal_api_key", "shodan_api_key"];

export async function GET() {
  const settings = listSettings();
  // Mask API key values for security — return only whether they are set
  const masked = settings
    .filter((s) => ALLOWED_KEYS.includes(s.key))
    .map((s) => ({
      key: s.key,
      set: !!s.value,
      updated_at: s.updated_at,
    }));
  return NextResponse.json(masked);
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const updates = body as Record<string, string>;

    for (const [key, value] of Object.entries(updates)) {
      if (!ALLOWED_KEYS.includes(key)) continue;
      if (typeof value !== "string") continue;
      if (value.trim() === "") continue;
      setSetting(key, value.trim());
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
