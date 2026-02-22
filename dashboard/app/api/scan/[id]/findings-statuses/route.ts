import { NextResponse } from "next/server";
import { getFindingStatuses } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const statuses = getFindingStatuses(id);
  return NextResponse.json(statuses);
}
