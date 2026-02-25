import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAppMonitor, saveAppCheckHistory, updateAppMonitorAfterCheck } from "@/lib/db";
import { checkApp, checkAvailability } from "@/lib/app-checker";
import { decryptValue } from "@/lib/crypto";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const monitor = getAppMonitor(id);
  if (!monitor) {
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  }

  try {
    let password: string;
    try {
      password = decryptValue(monitor.password_enc);
    } catch {
      password = monitor.password_enc;
    }

    // Check 1: Availability
    const availResult = await checkAvailability(monitor.url);
    saveAppCheckHistory(
      randomUUID(), id, availResult.checked_at,
      availResult.status, availResult.response_ms,
      availResult.status_code ?? null, availResult.error ?? null,
      "availability", availResult.response_detail ?? null
    );

    // Check 2: Login
    let loginResult;
    if (availResult.status === "up") {
      loginResult = await checkApp(monitor.url, monitor.username, password);
    } else {
      loginResult = {
        url: monitor.url,
        checked_at: new Date().toISOString(),
        status: "down" as const,
        response_ms: 0,
        status_code: null,
        error: "Skipped — site not reachable",
        response_detail: "Skipped — site not reachable",
      };
    }
    saveAppCheckHistory(
      randomUUID(), id, loginResult.checked_at,
      loginResult.status, loginResult.response_ms,
      loginResult.status_code ?? null, loginResult.error ?? null,
      "login", loginResult.response_detail ?? null
    );

    const overallStatus: "up" | "down" =
      availResult.status === "up" && loginResult.status === "up" ? "up" : "down";

    const now = new Date().toISOString();
    updateAppMonitorAfterCheck(id, overallStatus, availResult.response_ms, now, now, loginResult.status);

    return NextResponse.json({ status: overallStatus, availability: availResult, login: loginResult });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
