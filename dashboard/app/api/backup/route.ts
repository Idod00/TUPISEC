import { NextResponse } from "next/server";
import { listBackups } from "@/lib/db";
import { runBackup } from "@/lib/backup-scheduler";

export async function GET() {
  const backups = listBackups();
  return NextResponse.json(backups);
}

export async function POST() {
  try {
    const filename = await runBackup();
    return NextResponse.json({ ok: true, filename });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
