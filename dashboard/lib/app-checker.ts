import type { AppCheckResult } from "./types";

function buildAbsoluteUrl(base: string, action: string): string {
  if (!action) return base;
  try {
    return new URL(action, base).toString();
  } catch {
    return base;
  }
}

/** Extract cookies from a fetch Response to send in the next request */
function extractCookies(res: Response): string {
  try {
    // getSetCookie() returns each Set-Cookie header as a separate string (Node 18+)
    if (typeof (res.headers as { getSetCookie?: () => string[] }).getSetCookie === "function") {
      const cookies = (res.headers as { getSetCookie: () => string[] }).getSetCookie();
      return cookies.map((c) => c.split(";")[0]).join("; ");
    }
  } catch {}
  // Fallback: headers.get('set-cookie') (may be comma-joined)
  const raw = res.headers.get("set-cookie") ?? "";
  if (!raw) return "";
  return raw
    .split(/,(?=[^;]+=[^;]+;|[^;]+=)/)
    .map((c) => c.split(";")[0].trim())
    .join("; ");
}

export async function checkApp(
  url: string,
  username: string,
  password: string
): Promise<AppCheckResult> {
  const start = Date.now();
  const now = new Date().toISOString();

  try {
    // ── Step 1: GET login page (follow redirects to reach the actual login form) ──
    const getController = new AbortController();
    const getTimer = setTimeout(() => getController.abort(), 15000);

    let loginHtml = "";
    let loginStatus = 0;
    let finalUrl = url;   // URL after all redirects — critical for APEX relative form actions
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
      // Use the final URL (after redirects) so relative form actions resolve correctly
      finalUrl = getRes.url || url;
      // Capture session cookies (APEX requires these on the POST)
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

    // ── Step 2: Parse login form ──
    let postUrl = finalUrl;
    const formParams = new URLSearchParams();

    // Extract form action — use finalUrl as base (not the original url)
    const actionMatch = loginHtml.match(/action=["']([^"']+)["']/i);
    if (actionMatch) {
      postUrl = buildAbsoluteUrl(finalUrl, actionMatch[1]);
    }

    // Collect ALL hidden inputs
    const hiddenRe =
      /<input[^>]+type=["']hidden["'][^>]*>/gi;
    for (const inputTag of loginHtml.matchAll(hiddenRe)) {
      const tag = inputTag[0];
      const nameM = tag.match(/name=["']([^"']*)["']/i);
      const valM  = tag.match(/value=["']([^"']*)["']/i);
      if (nameM && valM) formParams.set(nameM[1], valM[1]);
    }
    // Also handle hidden inputs where value comes before name
    const hiddenRe2 = /<input[^>]+type=["']hidden["'][^>]*>/gi;
    for (const inputTag of loginHtml.matchAll(hiddenRe2)) {
      const tag = inputTag[0];
      const nameM = tag.match(/name=["']([^"']*)["']/i);
      const valM  = tag.match(/value=["']([^"']*)["']/i);
      if (nameM && !formParams.has(nameM[1]) && valM) {
        formParams.set(nameM[1], valM[1]);
      }
    }

    // Detect username field name (text or email input)
    let usernameField = "p_username";
    const userTagMatch = loginHtml.match(
      /<input[^>]+type=["'](text|email)["'][^>]*>/i
    );
    if (userTagMatch) {
      const nameM = userTagMatch[0].match(/name=["']([^"']*)["']/i);
      if (nameM) usernameField = nameM[1];
    }

    // Detect password field name
    let passwordField = "p_password";
    const passTagMatch = loginHtml.match(
      /<input[^>]+type=["']password["'][^>]*>/i
    );
    if (passTagMatch) {
      const nameM = passTagMatch[0].match(/name=["']([^"']*)["']/i);
      if (nameM) passwordField = nameM[1];
    }

    formParams.set(usernameField, username);
    formParams.set(passwordField, password);

    // ── Step 3: POST credentials ──
    const postController = new AbortController();
    const postTimer = setTimeout(() => postController.abort(), 15000);

    const postHeaders: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (compatible; TupiSec-Monitor/1.0)",
      "Accept": "text/html,application/xhtml+xml,*/*",
      "Referer": finalUrl,
    };
    // !! Pass session cookies — required for APEX and most session-based apps
    if (sessionCookies) {
      postHeaders["Cookie"] = sessionCookies;
    }

    try {
      const postRes = await fetch(postUrl, {
        method: "POST",
        headers: postHeaders,
        body: formParams.toString(),
        redirect: "manual",   // catch the 302 redirect ourselves
        signal: postController.signal,
      });
      clearTimeout(postTimer);

      const responseMs = Date.now() - start;
      const statusCode = postRes.status;

      // Redirect → login accepted ✓
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
        // No password field in response → we're past the login page
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
        // Still has password field → login failed
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
        error: `Unexpected HTTP ${statusCode} after POST`,
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
