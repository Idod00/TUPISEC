import { NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";
import { hashPassword, createSessionToken } from "@/lib/crypto";

export async function POST(request: Request) {
  if (process.env.TUPISEC_AUTH_ENABLED !== "true") {
    return NextResponse.json({ error: "Auth not enabled. Set TUPISEC_AUTH_ENABLED=true to enable." }, { status: 403 });
  }

  const existing = await getSetting("auth_password_hash");
  if (existing) {
    return NextResponse.json({ error: "Password already configured. Use /api/auth/change-password to update it." }, { status: 409 });
  }

  try {
    const { password } = await request.json();
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const { hash, salt } = hashPassword(password);
    await Promise.all([
      setSetting("auth_password_hash", hash),
      setSetting("auth_password_salt", salt),
    ]);

    const token = createSessionToken();
    const response = NextResponse.json({ ok: true });
    response.cookies.set("tupisec_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
