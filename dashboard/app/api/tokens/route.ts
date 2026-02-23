import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createApiToken as createApiTokenRecord, listApiTokens } from "@/lib/db";
import { createApiToken } from "@/lib/crypto";

export async function GET() {
  const tokens = listApiTokens();
  return NextResponse.json(tokens);
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const { token, prefix } = createApiToken();
    const id = randomUUID();
    createApiTokenRecord(id, name.trim(), prefix);
    // Return the full token once — it won't be stored
    return NextResponse.json({ id, name: name.trim(), token, prefix });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
