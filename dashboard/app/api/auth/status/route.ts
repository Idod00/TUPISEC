import { NextResponse } from "next/server";
import { countUsers } from "@/lib/db";
import { verifySessionToken } from "@/lib/crypto";

export async function GET(request: Request) {
  const enabled = process.env.TUPISEC_AUTH_ENABLED === "true";
  const userCount = await countUsers();
  const hasUsers = userCount > 0;

  // Extract role from session if present
  let role: string | null = null;
  let username: string | null = null;
  const cookieHeader = request.headers.get("cookie") || "";
  const sessionMatch = cookieHeader.match(/(?:^|;\s*)tupisec_session=([^;]+)/);
  if (sessionMatch) {
    const payload = verifySessionToken(decodeURIComponent(sessionMatch[1]));
    if (payload) {
      role = payload.role;
      // username not stored in token, omit here — use /api/auth/me for that
    }
  }

  return NextResponse.json({ enabled, hasUsers, role, username });
}
