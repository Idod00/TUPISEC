import { NextResponse } from "next/server";
import { upsertFindingStatus } from "@/lib/db";
import type { FindingStatusValue } from "@/lib/types";

const VALID_STATUSES: FindingStatusValue[] = ["open", "in_progress", "accepted", "resolved"];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  const { id, index } = await params;
  const findingIndex = parseInt(index, 10);

  if (isNaN(findingIndex) || findingIndex < 0) {
    return NextResponse.json({ error: "Invalid finding index" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { status, note } = body;

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const record = await upsertFindingStatus(
      id,
      findingIndex,
      status || "open",
      note ?? ""
    );

    return NextResponse.json(record);
  } catch (error) {
    console.error("Error updating finding status:", error);
    return NextResponse.json({ error: "Failed to update finding" }, { status: 500 });
  }
}
