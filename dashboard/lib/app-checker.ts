import type { AppCheckResult } from "./types";

function buildAbsoluteUrl(base: string, action: string): string {
  if (!action) return base;
  try {
    return new URL(action, base).toString();
  } catch {
    return base;
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
    // Step 1: GET login page
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    let loginHtml = "";
    let loginStatus = 0;

    try {
      const getRes = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "TupiSec-Monitor/1.0" },
      });
      clearTimeout(timer);
      loginStatus = getRes.status;
      loginHtml = await getRes.text().catch(() => "");

      if (getRes.status >= 400) {
        return {
          url,
          checked_at: now,
          status: "down",
          response_ms: Date.now() - start,
          status_code: getRes.status,
          error: `HTTP ${getRes.status}`,
        };
      }
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

    // Step 2: Parse form from HTML
    let postUrl = url;
    const formParams = new URLSearchParams();

    // Extract form action
    const formMatch = loginHtml.match(/<form[^>]*action=["']([^"']*)["'][^>]*>/i)
      ?? loginHtml.match(/<form[^>]*>/i);
    if (formMatch) {
      const actionMatch = formMatch[0].match(/action=["']([^"']*)["']/i);
      if (actionMatch) {
        postUrl = buildAbsoluteUrl(url, actionMatch[1]);
      }
    }

    // Collect hidden inputs
    const hiddenMatches = loginHtml.matchAll(
      /<input[^>]+type=["']hidden["'][^>]*name=["']([^"']*)["'][^>]*value=["']([^"']*)["'][^>]*>/gi
    );
    for (const m of hiddenMatches) {
      formParams.set(m[1], m[2]);
    }
    // Also catch reversed attribute order
    const hiddenMatches2 = loginHtml.matchAll(
      /<input[^>]+type=["']hidden["'][^>]*value=["']([^"']*)["'][^>]*name=["']([^"']*)["'][^>]*>/gi
    );
    for (const m of hiddenMatches2) {
      if (!formParams.has(m[2])) formParams.set(m[2], m[1]);
    }

    // Detect username field name
    let usernameField = "p_username";
    const userFieldMatch =
      loginHtml.match(/<input[^>]+type=["'](text|email)["'][^>]*name=["']([^"']*)["'][^>]*>/i) ??
      loginHtml.match(/<input[^>]+name=["']([^"']*)["'][^>]*type=["'](text|email)["'][^>]*>/i);
    if (userFieldMatch) {
      const nameIdx = userFieldMatch[0].match(/name=["']([^"']*)["']/i);
      if (nameIdx) usernameField = nameIdx[1];
    }

    // Detect password field name
    let passwordField = "p_password";
    const passFieldMatch =
      loginHtml.match(/<input[^>]+type=["']password["'][^>]*name=["']([^"']*)["'][^>]*>/i) ??
      loginHtml.match(/<input[^>]+name=["']([^"']*)["'][^>]*type=["']password["'][^>]*>/i);
    if (passFieldMatch) {
      const nameIdx = passFieldMatch[0].match(/name=["']([^"']*)["']/i);
      if (nameIdx) passwordField = nameIdx[1];
    }

    formParams.set(usernameField, username);
    formParams.set(passwordField, password);

    // Step 3: POST credentials
    const postController = new AbortController();
    const postTimer = setTimeout(() => postController.abort(), 10000);

    try {
      const postRes = await fetch(postUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "TupiSec-Monitor/1.0",
        },
        body: formParams.toString(),
        redirect: "manual",
        signal: postController.signal,
      });
      clearTimeout(postTimer);

      const responseMs = Date.now() - start;
      const statusCode = postRes.status;

      // Success detection
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
        // If response has no password field, assume login succeeded (no longer on login page)
        if (!responseHtml.includes('type="password"') && !responseHtml.includes("type='password'")) {
          return {
            url,
            checked_at: now,
            status: "up",
            response_ms: responseMs,
            status_code: statusCode,
          };
        }
      }

      return {
        url,
        checked_at: now,
        status: "down",
        response_ms: responseMs,
        status_code: statusCode,
        error: `Login failed (HTTP ${statusCode})`,
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
