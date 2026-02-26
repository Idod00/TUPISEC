import { NextResponse } from "next/server";
import { getUserByUsername, updateUserLastLogin } from "@/lib/db";
import { verifyPassword, createSessionToken } from "@/lib/crypto";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const user = await getUserByUsername(username);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = verifyPassword(password, user.password_hash, user.password_salt);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await updateUserLastLogin(user.id);

    const token = createSessionToken(user.id, user.role);
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
