/**
 * Runs before every page and API route:
 *  1. refreshes the API access token shortly before it expires, and writes the new tokens back into
 *     the encrypted session cookie (for this request and the browser);
 *  2. sends signed-out visitors of app pages to sign-in, and signed-in visitors away from sign-in.
 */
import { encode, getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

import { REFRESH_MARGIN_MS, SESSION_MAX_AGE, expiresAt, refreshTokens, sessionCookieName } from "@/lib/auth/tokens";

const APP_PREFIXES = ["/workspaces", "/w/", "/account"];
const AUTH_PAGES = ["/signin", "/signup"];

export async function proxy(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  const secure = req.nextUrl.protocol === "https:";
  const cookieName = sessionCookieName(secure);
  let token = secret ? await getToken({ req, secret, secureCookie: secure }) : null;
  let newCookie: string | null | undefined; // string = set, null = clear, undefined = unchanged

  if (token?.access && token.accessExpires - Date.now() < REFRESH_MARGIN_MS) {
    const fresh = await refreshTokens(token.refresh);
    if (fresh === "invalid") {
      token = null;
      newCookie = null;
      req.cookies.delete(cookieName);
    } else if (fresh !== "unavailable" && secret) {
      token = { ...token, access: fresh.access, refresh: fresh.refresh, accessExpires: expiresAt(fresh.access) };
      newCookie = await encode({ token, secret, maxAge: SESSION_MAX_AGE });
      req.cookies.set(cookieName, newCookie);
    }
    // "unavailable": keep the session; the request goes ahead and the API answers for itself.
  }

  const path = req.nextUrl.pathname;
  const signedIn = Boolean(token?.access);
  let res: NextResponse;
  if (!signedIn && APP_PREFIXES.some((p) => path.startsWith(p))) {
    const url = new URL("/signin", req.url);
    url.searchParams.set("callbackUrl", path + req.nextUrl.search);
    if (newCookie === null) url.searchParams.set("expired", "1");
    res = NextResponse.redirect(url);
  } else if (signedIn && AUTH_PAGES.includes(path)) {
    res = NextResponse.redirect(new URL("/workspaces", req.url));
  } else {
    res = NextResponse.next({ request: { headers: req.headers } });
  }

  if (typeof newCookie === "string") {
    res.cookies.set(cookieName, newCookie, { httpOnly: true, sameSite: "lax", path: "/", secure, maxAge: SESSION_MAX_AGE });
  } else if (newCookie === null) {
    res.cookies.set(cookieName, "", { httpOnly: true, sameSite: "lax", path: "/", secure, maxAge: 0 });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
