import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { listNotificationConfigs, createNotificationConfig } from "@/lib/db";
import type { NotificationConfig } from "@/lib/types";

export async function GET() {
  const configs = await listNotificationConfigs();
  return NextResponse.json(configs);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, url, enabled, notify_on_complete, notify_on_critical, min_risk_score } = body;

    if (!name || !type || !url) {
      return NextResponse.json({ error: "name, type, and url are required" }, { status: 400 });
    }
    if (type !== "slack" && type !== "webhook") {
      return NextResponse.json({ error: "type must be 'slack' or 'webhook'" }, { status: 400 });
    }

    const config: Omit<NotificationConfig, "created_at"> = {
      id: uuidv4(),
      name,
      type,
      url,
      enabled: enabled !== false ? 1 : 0,
      notify_on_complete: notify_on_complete !== false ? 1 : 0,
      notify_on_critical: notify_on_critical !== false ? 1 : 0,
      min_risk_score: typeof min_risk_score === "number" ? min_risk_score : 100,
    };

    const created = await createNotificationConfig(config);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating notification config:", error);
    return NextResponse.json({ error: "Failed to create config" }, { status: 500 });
  }
}
