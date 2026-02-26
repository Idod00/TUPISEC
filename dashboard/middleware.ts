import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SECRET_BASE = process.env.TUPISEC_SECRET || "tupisec-default-key-change-me-please";

async function validateSessionToken(token: string): Promise<{ userId: string; role: string } | null> {
  const parts = token.split("|");
  if (parts.length !== 5) return null;
  const [userId, role, timestamp, nonce, mac] = parts;
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Date.now() / 1000 - ts > 86400 * 7) return null;

  const secret = SECRET_BASE + ":session";
  try {
    const keyMaterial = new TextEncoder().encode(secret);
    const key = await crypto.subtle.importKey("raw", keyMaterial, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${userId}|${role}|${timestamp}|${nonce}`));
    const computed = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
    if (computed !== mac) return null;
    return { userId, role };
  } catch {
    return null;
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

  const secret = SECRET_BASE + ":api-token";
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

// Returns true if the given role has access to the pathname
function checkRoutePermission(pathname: string, role: string): boolean {
  // Admin-only routes
  if (
    pathname.startsWith("/settings") ||
    pathname.startsWith("/api/settings") ||
    pathname.startsWith("/api/auth/users")
  ) {
    return role === "admin";
  }

  // Monitoreo + Admin routes
  if (
    pathname.startsWith("/ssl") ||
    pathname.startsWith("/monitors") ||
    pathname.startsWith("/api/ssl-monitors") ||
    pathname.startsWith("/api/app-monitors")
  ) {
    return role === "admin" || role === "monitoreo";
  }

  // Seguridad + Admin routes
  if (
    pathname === "/" ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/batch") ||
    pathname.startsWith("/schedules") ||
    pathname.startsWith("/scan") ||
    pathname.startsWith("/compare") ||
    pathname.startsWith("/api/scans") ||
    pathname.startsWith("/api/batch") ||
    pathname.startsWith("/api/schedules")
  ) {
    return role === "admin" || role === "seguridad";
  }

  // All other authenticated routes are allowed for any role
  return true;
}

// Returns the default landing page for a role when redirected due to no permission
function roleDefaultPath(role: string): string {
  if (role === "monitoreo") return "/ssl";
  return "/";
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

  // Check Bearer token (API tokens for CI/CD) — assigned role admin
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
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await validateSessionToken(session);
  if (!payload) {
    const response = pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));
    if (!pathname.startsWith("/api/")) {
      (response as ReturnType<typeof NextResponse.redirect>).cookies.delete("tupisec_session");
    }
    return response;
  }

  // Role-based permission check
  const allowed = checkRoutePermission(pathname, payload.role);
  if (!allowed) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL(roleDefaultPath(payload.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.png$|.*\\.svg$|.*\\.ico$).*)"],
};
