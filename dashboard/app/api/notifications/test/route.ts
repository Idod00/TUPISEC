import { NextResponse } from "next/server";
import { testNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const result = await testNotification(id);
    if (result.ok) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
