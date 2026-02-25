import { NextResponse } from "next/server";
import { getSetting } from "@/lib/db";
import { verifyPassword, createSessionToken } from "@/lib/crypto";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    if (!password) return NextResponse.json({ error: "Password required" }, { status: 400 });

    const [hash, salt] = await Promise.all([
      getSetting("auth_password_hash"),
      getSetting("auth_password_salt"),
    ]);

    if (!hash || !salt) {
      return NextResponse.json({ error: "Authentication not configured. Use /api/auth/setup first." }, { status: 403 });
    }

    const valid = verifyPassword(password, hash, salt);
    if (!valid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

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
