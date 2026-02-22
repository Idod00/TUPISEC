import { NextResponse } from "next/server";
import { getScreenshotPath, screenshotExists } from "@/lib/screenshot";
import fs from "fs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!screenshotExists(id)) {
    return NextResponse.json({ error: "Screenshot not found" }, { status: 404 });
  }

  const filePath = getScreenshotPath(id);
  const buffer = fs.readFileSync(filePath);

  return new Response(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
