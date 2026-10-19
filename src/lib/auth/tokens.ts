/**
 * The API issues short-lived access tokens and rotating refresh tokens. next-auth keeps both in its
 * encrypted, HttpOnly session cookie; the browser's JavaScript never sees them.
 */
export const SESSION_MAX_AGE = 14 * 24 * 60 * 60; // matches the API's refresh token lifetime
export const REFRESH_MARGIN_MS = 60_000;

export function apiUrl(path: string): string {
  const base = (process.env.API_URL || "http://localhost:8000").replace(/\/$/, "");
  return `${base}${path}`;
}

/** When a JWT expires (ms since epoch). Reads the payload only; the API verifies signatures. */
export function expiresAt(jwt: string): number {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export interface ApiTokens {
  access: string;
  refresh: string;
}

/**
 * New tokens; "invalid" when the API rejects the refresh token (expired or signed out), so the
 * session must end; "unavailable" when the API could not be reached, so the session is kept.
 */
export async function refreshTokens(refresh: string): Promise<ApiTokens | "invalid" | "unavailable"> {
  try {
    const res = await fetch(apiUrl("/api/v1/auth/refresh/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
      cache: "no-store",
    });
    if (res.status === 400 || res.status === 401) return "invalid";
    if (!res.ok) return "unavailable";
    const data = await res.json();
    return data.access ? { access: data.access, refresh: data.refresh ?? refresh } : "unavailable";
  } catch {
    return "unavailable";
  }
}

export function sessionCookieName(secure: boolean): string {
  return secure ? "__Secure-next-auth.session-token" : "next-auth.session-token";
}
