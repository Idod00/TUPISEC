import { NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/crypto";

export async function POST(request: Request) {
  try {
    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Both current and new password are required" }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    const hash = getSetting("auth_password_hash");
    const salt = getSetting("auth_password_salt");
    if (!hash || !salt) {
      return NextResponse.json({ error: "No password configured" }, { status: 404 });
    }

    if (!verifyPassword(currentPassword, hash, salt)) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    const { hash: newHash, salt: newSalt } = hashPassword(newPassword);
    setSetting("auth_password_hash", newHash);
    setSetting("auth_password_salt", newSalt);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
