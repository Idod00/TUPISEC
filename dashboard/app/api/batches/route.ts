import { NextResponse } from "next/server";
import { listBatches } from "@/lib/db";

export async function GET() {
  const batches = listBatches();
  return NextResponse.json(batches);
}
