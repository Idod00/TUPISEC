import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createScan, completeScan, failScan } from "@/lib/db";
import { runScan } from "@/lib/scanner";
import { emitProgress } from "@/lib/scan-store";
import { calculateScore } from "@/lib/scoring";
import { captureScreenshot } from "@/lib/screenshot";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, cookies } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    const id = uuidv4();
    const record = createScan(id, url);

    // Spawn scanner in background
    runScan(
      url,
      (progress) => {
        emitProgress(id, progress);
      },
      (report) => {
        const score = calculateScore(report);
        completeScan(id, report, score);
        emitProgress(id, { phase: "done", step: 10, total: 10, message: "Complete" });
        // Capture screenshot in background (fire and forget)
        captureScreenshot(url, id).catch(() => {});
      },
      (error) => {
        console.error(`Scan ${id} failed:`, error);
        failScan(id);
        emitProgress(id, { phase: "error", step: 0, total: 10, message: error });
      },
      cookies
    );

    return NextResponse.json({ id: record.id, status: "running" });
  } catch (error) {
    console.error("Error starting scan:", error);
    return NextResponse.json({ error: "Failed to start scan" }, { status: 500 });
  }
}
