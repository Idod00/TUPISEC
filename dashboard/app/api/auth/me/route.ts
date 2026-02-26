import { NextResponse } from "next/server";
import { getUserById } from "@/lib/db";
import { verifySessionToken } from "@/lib/crypto";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const sessionMatch = cookieHeader.match(/(?:^|;\s*)tupisec_session=([^;]+)/);
  if (!sessionMatch) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = verifySessionToken(decodeURIComponent(sessionMatch[1]));
  if (!payload) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const user = await getUserById(payload.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ userId: user.id, username: user.username, role: user.role });
}
