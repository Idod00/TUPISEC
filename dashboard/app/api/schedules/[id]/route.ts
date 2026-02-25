import { NextResponse } from "next/server";
import { deleteSchedule } from "@/lib/db";
import { unregisterSchedule } from "@/lib/scheduler";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  unregisterSchedule(id);
  const deleted = await deleteSchedule(id);
  if (!deleted) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
