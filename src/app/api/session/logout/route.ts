/** Revoke the API refresh token before next-auth clears the session cookie. */
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

import { apiUrl } from "@/lib/auth/tokens";

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token?.access && token.refresh) {
    await fetch(apiUrl("/api/v1/auth/logout/"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.access}` },
      body: JSON.stringify({ refresh: token.refresh }),
      cache: "no-store",
    }).catch(() => undefined);
  }
  return new Response(null, { status: 204 });
}
