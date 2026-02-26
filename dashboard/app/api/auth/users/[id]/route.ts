import { NextResponse } from "next/server";
import { getUserById, deleteUser, updateUserRole, updateUserPassword, listUsers } from "@/lib/db";
import { hashPassword, verifySessionToken } from "@/lib/crypto";
import type { UserRole } from "@/lib/types";

const VALID_ROLES: UserRole[] = ["admin", "monitoreo", "seguridad"];

function getSessionPayload(request: Request): { userId: string; role: string } | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const sessionMatch = cookieHeader.match(/(?:^|;\s*)tupisec_session=([^;]+)/);
  if (!sessionMatch) return null;
  return verifySessionToken(decodeURIComponent(sessionMatch[1]));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSessionPayload(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const user = await getUserById(id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    const body = await request.json();

    if (body.role !== undefined) {
      if (!VALID_ROLES.includes(body.role as UserRole)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      // Prevent demoting the last admin
      if (user.role === "admin" && body.role !== "admin") {
        const allUsers = await listUsers();
        const adminCount = allUsers.filter((u) => u.role === "admin").length;
        if (adminCount <= 1) {
          return NextResponse.json({ error: "Cannot demote the last admin" }, { status: 400 });
        }
      }
      await updateUserRole(id, body.role as UserRole);
    }

    if (body.password !== undefined) {
      if (body.password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      }
      const { hash, salt } = hashPassword(body.password);
      await updateUserPassword(id, hash, salt);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSessionPayload(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent deleting yourself
  if (session.userId === id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  // Prevent deleting last admin
  const user = await getUserById(id);
  if (user?.role === "admin") {
    const allUsers = await listUsers();
    const adminCount = allUsers.filter((u) => u.role === "admin").length;
    if (adminCount <= 1) {
      return NextResponse.json({ error: "Cannot delete the last admin" }, { status: 400 });
    }
  }

  const deleted = await deleteUser(id);
  if (!deleted) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
