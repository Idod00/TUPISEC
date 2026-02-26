import { NextResponse } from "next/server";
import { listUsers, createUser, countUsers } from "@/lib/db";
import { hashPassword, verifySessionToken } from "@/lib/crypto";
import { randomUUID } from "crypto";
import type { UserRole } from "@/lib/types";

const VALID_ROLES: UserRole[] = ["admin", "monitoreo", "seguridad"];

function getSessionPayload(request: Request): { userId: string; role: string } | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const sessionMatch = cookieHeader.match(/(?:^|;\s*)tupisec_session=([^;]+)/);
  if (!sessionMatch) return null;
  return verifySessionToken(decodeURIComponent(sessionMatch[1]));
}

export async function GET(request: Request) {
  const payload = getSessionPayload(request);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const users = await listUsers();
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const payload = getSessionPayload(request);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { username, password, role } = await request.json();
    if (!username || username.trim().length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (!role || !VALID_ROLES.includes(role as UserRole)) {
      return NextResponse.json({ error: "Invalid role. Must be admin, monitoreo, or seguridad" }, { status: 400 });
    }

    const userCount = await countUsers();
    if (userCount === 0 && role !== "admin") {
      return NextResponse.json({ error: "First user must be admin" }, { status: 400 });
    }

    const { hash, salt } = hashPassword(password);
    const id = randomUUID();
    const user = await createUser(id, username.trim(), hash, salt, role as UserRole);
    return NextResponse.json({
      id: user.id,
      username: user.username,
      role: user.role,
      created_at: user.created_at,
      last_login: user.last_login,
    }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate") || msg.toLowerCase().includes("users_username_key")) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
