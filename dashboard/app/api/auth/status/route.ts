import { NextResponse } from "next/server";
import { getSetting } from "@/lib/db";

export async function GET() {
  const configured = !!getSetting("auth_password_hash");
  const enabled = process.env.TUPISEC_AUTH_ENABLED === "true";
  return NextResponse.json({ configured, enabled });
}
