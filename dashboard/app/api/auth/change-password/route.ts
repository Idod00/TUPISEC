import { NextResponse } from "next/server";
import { getUserById, updateUserPassword } from "@/lib/db";
import { verifyPassword, hashPassword, verifySessionToken } from "@/lib/crypto";

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const sessionMatch = cookieHeader.match(/(?:^|;\s*)tupisec_session=([^;]+)/);
    if (!sessionMatch) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const payload = verifySessionToken(decodeURIComponent(sessionMatch[1]));
    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Both current and new password are required" }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    const user = await getUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!verifyPassword(currentPassword, user.password_hash, user.password_salt)) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    const { hash: newHash, salt: newSalt } = hashPassword(newPassword);
    await updateUserPassword(user.id, newHash, newSalt);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
