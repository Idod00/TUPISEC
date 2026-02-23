import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

async function validateToken(token: string): Promise<boolean> {
  const parts = token.split(":");
  if (parts.length !== 3) return false;
  const [timestamp, nonce, mac] = parts;
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Date.now() / 1000 - ts > 86400 * 7) return false;

  const secret = (process.env.TUPISEC_SECRET || "tupisec-default-key-change-me-please") + ":session";
  try {
    const keyMaterial = new TextEncoder().encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyMaterial,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${timestamp}:${nonce}`)
    );
    const computed = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return computed === mac;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  if (process.env.TUPISEC_AUTH_ENABLED !== "true") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get("tupisec_session")?.value;
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const valid = await validateToken(session);
  if (!valid) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("tupisec_session");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.png$|.*\\.svg$|.*\\.ico$).*)"],
};
