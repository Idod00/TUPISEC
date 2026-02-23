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
    const key = await crypto.subtle.importKey("raw", keyMaterial, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}:${nonce}`));
    const computed = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return computed === mac;
  } catch {
    return false;
  }
}

async function validateApiTokenEdge(token: string): Promise<boolean> {
  if (!token.startsWith("tupisec_api_")) return false;
  const rest = token.slice("tupisec_api_".length);
  const parts = rest.split("_");
  if (parts.length < 3) return false;
  const hmac = parts[parts.length - 1];
  const nonce = parts[parts.length - 2];
  const timestamp = parts[parts.length - 3];
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Date.now() / 1000 - ts > 86400 * 365) return false;

  const secret = (process.env.TUPISEC_SECRET || "tupisec-default-key-change-me-please") + ":api-token";
  try {
    const keyMaterial = new TextEncoder().encode(secret);
    const key = await crypto.subtle.importKey("raw", keyMaterial, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}:${nonce}`));
    const computed = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return computed === hmac;
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

  // Check Bearer token (API tokens for CI/CD)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const bearerToken = authHeader.slice(7);
    const validApi = await validateApiTokenEdge(bearerToken);
    if (validApi) return NextResponse.next();
    return NextResponse.json({ error: "Invalid API token" }, { status: 401 });
  }

  // Check session cookie
  const session = request.cookies.get("tupisec_session")?.value;
  if (!session) {
    // For API routes, return 401 instead of redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
