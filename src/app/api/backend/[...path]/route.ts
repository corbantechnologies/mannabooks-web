/**
 * Same-origin gateway to the API. The browser calls /api/backend/api/v1/...; this route attaches the
 * signed-in user's access token (read from the encrypted session cookie) and forwards the request.
 */
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

import { apiUrl } from "@/lib/auth/tokens";

async function forward(req: NextRequest): Promise<Response> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const target = apiUrl(req.nextUrl.pathname.replace(/^\/api\/backend/, "") + req.nextUrl.search);
  const headers: Record<string, string> = { Accept: "application/json" };
  const contentType = req.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;
  if (token?.access) headers.Authorization = `Bearer ${token.access}`;
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) headers["X-Forwarded-For"] = forwardedFor;

  const hasBody = !["GET", "HEAD"].includes(req.method);
  try {
    const res = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      cache: "no-store",
      redirect: "manual",
    });
    const out = new Headers();
    const resType = res.headers.get("content-type");
    if (resType) out.set("Content-Type", resType);
    const disposition = res.headers.get("content-disposition"); // keeps a PDF's file name
    if (disposition) out.set("Content-Disposition", disposition);
    return new Response(res.status === 204 ? null : res.body, { status: res.status, headers: out });
  } catch {
    return Response.json(
      { code: "unavailable", message: "The MannaBooks service can't be reached. Try again shortly.", errors: {} },
      { status: 503 },
    );
  }
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
