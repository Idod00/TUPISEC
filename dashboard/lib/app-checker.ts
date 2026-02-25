import type { AppCheckResult } from "./types";

function buildAbsoluteUrl(base: string, href: string): string {
  if (!href) return base;
  try {
    return new URL(href, base).toString();
  } catch {
    return base;
  }
}

/** Extract cookies from a fetch Response to forward in the next request */
function extractCookies(res: Response): string {
  try {
    if (typeof (res.headers as { getSetCookie?: () => string[] }).getSetCookie === "function") {
      const cookies = (res.headers as { getSetCookie: () => string[] }).getSetCookie();
      return cookies.map((c) => c.split(";")[0]).join("; ");
    }
  } catch {}
  const raw = res.headers.get("set-cookie") ?? "";
  if (!raw) return "";
  return raw
    .split(/,(?=[^;]+=[^;]+;|[^;]+=)/)
    .map((c) => c.split(";")[0].trim())
    .join("; ");
}

export async function checkAvailability(url: string): Promise<AppCheckResult> {
  const start = Date.now();
  const now = new Date().toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TupiSec-Monitor/1.0)",
        "Accept": "text/html,*/*",
      },
    });
    clearTimeout(timer);
    return {
      url,
      checked_at: now,
      status: "up",   // any HTTP response = server is reachable
      response_ms: Date.now() - start,
      status_code: res.status,
    };
  } catch (err) {
    clearTimeout(timer);
    return {
      url,
      checked_at: now,
      status: "down",
      response_ms: Date.now() - start,
      status_code: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function checkApp(
  url: string,
  username: string,
  password: string
): Promise<AppCheckResult> {
  const start = Date.now();
  const now = new Date().toISOString();

  try {
    // ── Step 1: GET login page ──────────────────────────────────────
    const getController = new AbortController();
    const getTimer = setTimeout(() => getController.abort(), 15000);

    let loginHtml = "";
    let loginStatus = 0;
    let finalUrl = url;
    let sessionCookies = "";

    try {
      const getRes = await fetch(url, {
        redirect: "follow",
        signal: getController.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; TupiSec-Monitor/1.0)",
          "Accept": "text/html,application/xhtml+xml,*/*",
        },
      });
      clearTimeout(getTimer);
      loginStatus = getRes.status;
      finalUrl = getRes.url || url;
      sessionCookies = extractCookies(getRes);
      loginHtml = await getRes.text().catch(() => "");

      if (getRes.status >= 400) {
        return {
          url,
          checked_at: now,
          status: "down",
          response_ms: Date.now() - start,
          status_code: getRes.status,
          error: `HTTP ${getRes.status} on GET`,
        };
      }
    } catch (err) {
      clearTimeout(getTimer);
      return {
        url,
        checked_at: now,
        status: "down",
        response_ms: Date.now() - start,
        status_code: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    // ── Step 2: Determine the effective base URL ────────────────────
    // HTML <base href="..."> overrides the document base for relative URLs.
    // APEX always emits <base href="/ords/" /> — ignoring it causes 404.
    let baseUrl = finalUrl;
    const baseTagMatch = loginHtml.match(/<base[^>]+href=["']([^"']*)["']/i);
    if (baseTagMatch) {
      baseUrl = buildAbsoluteUrl(finalUrl, baseTagMatch[1]);
    }

    // ── Step 3: Parse login form ────────────────────────────────────
    let postUrl = baseUrl;
    const formParams = new URLSearchParams();

    // Form action — resolve relative to the effective base URL
    const actionMatch = loginHtml.match(/action=["']([^"']+)["']/i);
    if (actionMatch) {
      postUrl = buildAbsoluteUrl(baseUrl, actionMatch[1]);
    }

    // Collect all hidden inputs
    for (const inputTag of loginHtml.matchAll(/<input[^>]+type=["']hidden["'][^>]*>/gi)) {
      const tag = inputTag[0];
      const nameM = tag.match(/name=["']([^"']*)["']/i);
      const valM  = tag.match(/value=["']([^"']*)["']/i);
      if (nameM && valM) formParams.set(nameM[1], valM[1]);
    }

    // Detect username field name (text or email input)
    let usernameField = "p_username";
    const userTagMatch = loginHtml.match(/<input[^>]+type=["'](text|email)["'][^>]*>/i);
    if (userTagMatch) {
      const nameM = userTagMatch[0].match(/name=["']([^"']*)["']/i);
      if (nameM) usernameField = nameM[1];
    }

    // Detect password field name
    let passwordField = "p_password";
    const passTagMatch = loginHtml.match(/<input[^>]+type=["']password["'][^>]*>/i);
    if (passTagMatch) {
      const nameM = passTagMatch[0].match(/name=["']([^"']*)["']/i);
      if (nameM) passwordField = nameM[1];
    }

    formParams.set(usernameField, username);
    formParams.set(passwordField, password);

    // ── APEX-specific: set p_request=LOGIN ─────────────────────────
    // APEX login pages use apex.submit({request:'LOGIN'}) via JS.
    // The hidden p_request field is empty in the HTML; we must set it.
    // Detection: APEX pages have p_flow_id or p_instance hidden fields.
    const isApex =
      formParams.has("p_flow_id") ||
      formParams.has("p_instance") ||
      loginHtml.includes("wwv_flow");
    if (isApex && formParams.has("p_request")) {
      formParams.set("p_request", "LOGIN");
    }

    // ── Step 4: POST credentials ────────────────────────────────────
    const postController = new AbortController();
    const postTimer = setTimeout(() => postController.abort(), 15000);

    const postHeaders: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (compatible; TupiSec-Monitor/1.0)",
      "Accept": "text/html,application/xhtml+xml,*/*",
      "Referer": finalUrl,
    };
    if (sessionCookies) {
      postHeaders["Cookie"] = sessionCookies;
    }

    try {
      const postRes = await fetch(postUrl, {
        method: "POST",
        headers: postHeaders,
        body: formParams.toString(),
        redirect: "manual",
        signal: postController.signal,
      });
      clearTimeout(postTimer);

      const responseMs = Date.now() - start;
      const statusCode = postRes.status;

      // Redirect after POST → login accepted ✓
      if ([301, 302, 303, 307, 308].includes(statusCode)) {
        return {
          url,
          checked_at: now,
          status: "up",
          response_ms: responseMs,
          status_code: statusCode,
        };
      }

      if (statusCode === 200) {
        const responseHtml = await postRes.text().catch(() => "");
        // No password field in response → past the login page
        if (
          !responseHtml.includes('type="password"') &&
          !responseHtml.includes("type='password'")
        ) {
          return {
            url,
            checked_at: now,
            status: "up",
            response_ms: responseMs,
            status_code: statusCode,
          };
        }
        return {
          url,
          checked_at: now,
          status: "down",
          response_ms: responseMs,
          status_code: statusCode,
          error: "Login failed — still on login page after POST",
        };
      }

      return {
        url,
        checked_at: now,
        status: "down",
        response_ms: responseMs,
        status_code: statusCode,
        error: `Unexpected HTTP ${statusCode} after POST to ${postUrl}`,
      };
    } catch (err) {
      clearTimeout(postTimer);
      return {
        url,
        checked_at: now,
        status: "down",
        response_ms: Date.now() - start,
        status_code: loginStatus || null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  } catch (err) {
    return {
      url,
      checked_at: now,
      status: "down",
      response_ms: Date.now() - start,
      status_code: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
