import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createBatch, createScan, completeScan, failScan, updateBatchProgress, completeBatch } from "@/lib/db";
import { runScan } from "@/lib/scanner";
import { emitProgress } from "@/lib/scan-store";
import { emitBatchProgress } from "@/lib/batch-store";
import { calculateScore } from "@/lib/scoring";
import { captureScreenshot } from "@/lib/screenshot";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { urls, cookies } = body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "urls array is required" }, { status: 400 });
    }

    // Validate all URLs
    const validUrls: string[] = [];
    for (const u of urls) {
      const trimmed = (u as string).trim();
      if (!trimmed) continue;
      let targetUrl = trimmed;
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = "https://" + targetUrl;
      }
      try {
        new URL(targetUrl);
        validUrls.push(targetUrl);
      } catch {
        // skip invalid
      }
    }

    if (validUrls.length === 0) {
      return NextResponse.json({ error: "No valid URLs provided" }, { status: 400 });
    }

    const batchId = uuidv4();
    createBatch(batchId, validUrls);

    // Process URLs with concurrency limit of 3
    const scanIds: string[] = [];
    let completedCount = 0;
    let failedCount = 0;

    const processUrl = (url: string): Promise<void> => {
      return new Promise((resolve) => {
        const scanId = uuidv4();
        scanIds.push(scanId);
        createScan(scanId, url);

        emitBatchProgress(batchId, {
          completedUrls: completedCount,
          failedUrls: failedCount,
          totalUrls: validUrls.length,
          currentUrl: url,
          phase: "running",
        });

        runScan(
          url,
          (progress) => {
            emitProgress(scanId, progress);
          },
          (report) => {
            const score = calculateScore(report);
            completeScan(scanId, report, score);
            emitProgress(scanId, { phase: "done", step: 10, total: 10, message: "Complete" });
            captureScreenshot(url, scanId).catch(() => {});
            completedCount++;
            updateBatchProgress(batchId, scanIds, completedCount, failedCount);
            emitBatchProgress(batchId, {
              completedUrls: completedCount,
              failedUrls: failedCount,
              totalUrls: validUrls.length,
              currentUrl: url,
              phase: completedCount + failedCount >= validUrls.length ? "done" : "running",
            });
            if (completedCount + failedCount >= validUrls.length) {
              completeBatch(batchId);
            }
            resolve();
          },
          (error) => {
            console.error(`Batch scan ${scanId} failed:`, error);
            failScan(scanId);
            emitProgress(scanId, { phase: "error", step: 0, total: 10, message: error });
            failedCount++;
            updateBatchProgress(batchId, scanIds, completedCount, failedCount);
            emitBatchProgress(batchId, {
              completedUrls: completedCount,
              failedUrls: failedCount,
              totalUrls: validUrls.length,
              currentUrl: url,
              phase: completedCount + failedCount >= validUrls.length ? "done" : "running",
            });
            if (completedCount + failedCount >= validUrls.length) {
              completeBatch(batchId);
            }
            resolve();
          },
          cookies
        );
      });
    };

    // Concurrency limiter: max 3 concurrent scans
    (async () => {
      const queue = [...validUrls];
      const active: Promise<void>[] = [];

      while (queue.length > 0 || active.length > 0) {
        while (active.length < 3 && queue.length > 0) {
          const url = queue.shift()!;
          const p = processUrl(url).then(() => {
            active.splice(active.indexOf(p), 1);
          });
          active.push(p);
        }
        if (active.length > 0) {
          await Promise.race(active);
        }
      }
    })();

    return NextResponse.json({ id: batchId, status: "running", total: validUrls.length });
  } catch (error) {
    console.error("Error starting batch:", error);
    return NextResponse.json({ error: "Failed to start batch scan" }, { status: 500 });
  }
}
