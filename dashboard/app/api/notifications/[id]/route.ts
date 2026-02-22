import { NextResponse } from "next/server";
import { deleteNotificationConfig, getNotificationConfig } from "@/lib/db";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const config = getNotificationConfig(id);
  if (!config) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  deleteNotificationConfig(id);
  return NextResponse.json({ ok: true });
}
