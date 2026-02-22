import path from "path";
import fs from "fs";

const SCREENSHOTS_DIR = path.join(process.cwd(), "data", "screenshots");

export function getScreenshotPath(scanId: string): string {
  return path.join(SCREENSHOTS_DIR, `${scanId}.png`);
}

export function screenshotExists(scanId: string): boolean {
  return fs.existsSync(getScreenshotPath(scanId));
}

export async function captureScreenshot(url: string, scanId: string): Promise<string> {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const filePath = getScreenshotPath(scanId);

  try {
    const puppeteer = await import("puppeteer-core");

    // Try common Chromium paths on macOS
    const chromePaths = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
    ];

    let executablePath: string | undefined;
    for (const p of chromePaths) {
      if (fs.existsSync(p)) {
        executablePath = p;
        break;
      }
    }

    if (!executablePath) {
      throw new Error("No Chrome/Chromium browser found");
    }

    const browser = await puppeteer.default.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await page.screenshot({ path: filePath, type: "png" });
    await browser.close();

    return filePath;
  } catch (error) {
    console.error("Screenshot capture failed:", error);
    throw error;
  }
}
