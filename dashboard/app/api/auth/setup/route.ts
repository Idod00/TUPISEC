import { NextResponse } from "next/server";
import { countUsers, createUser } from "@/lib/db";
import { hashPassword, createSessionToken } from "@/lib/crypto";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  if (process.env.TUPISEC_AUTH_ENABLED !== "true") {
    return NextResponse.json({ error: "Auth not enabled. Set TUPISEC_AUTH_ENABLED=true to enable." }, { status: 403 });
  }

  const existing = await countUsers();
  if (existing > 0) {
    return NextResponse.json({ error: "Users already exist. Use the users API to manage accounts." }, { status: 409 });
  }

  try {
    const { username, password } = await request.json();
    if (!username || username.trim().length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const { hash, salt } = hashPassword(password);
    const id = randomUUID();
    await createUser(id, username.trim(), hash, salt, "admin");

    const token = createSessionToken(id, "admin");
    const response = NextResponse.json({ ok: true });
    response.cookies.set("tupisec_session", token, {
      httpOnly: true,
      secure: process.env.TUPISEC_COOKIE_SECURE === "true",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
