import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createScan, completeScan, failScan } from "@/lib/db";
import { runScan } from "@/lib/scanner";
import { emitProgress } from "@/lib/scan-store";
import { calculateScore } from "@/lib/scoring";
import { captureScreenshot } from "@/lib/screenshot";
import { dispatchNotifications } from "@/lib/notifications";
import { enrichScan } from "@/lib/enrichment";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, cookies, quick_scan, skip_modules } = body;

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
    const record = await createScan(id, url);

    // Spawn scanner in background
    runScan(
      url,
      (progress) => {
        emitProgress(id, progress);
      },
      async (report) => {
        const score = calculateScore(report);
        await completeScan(id, report, score);
        emitProgress(id, { phase: "done", step: 10, total: 10, message: "Complete" });
        // Fire-and-forget background tasks
        captureScreenshot(url, id).catch(() => {});
        dispatchNotifications(id, url, score, report).catch(() => {});
        enrichScan(id).catch(() => {});
      },
      async (error) => {
        console.error(`Scan ${id} failed:`, error);
        await failScan(id);
        emitProgress(id, { phase: "error", step: 0, total: 10, message: error });
      },
      cookies,
      quick_scan === true,
      typeof skip_modules === "string" ? skip_modules : undefined,
      id
    );

    return NextResponse.json({ id: record.id, status: "running" });
  } catch (error) {
    console.error("Error starting scan:", error);
    return NextResponse.json({ error: "Failed to start scan" }, { status: 500 });
  }
}
