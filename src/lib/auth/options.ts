import type { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { SESSION_MAX_AGE, apiUrl, expiresAt } from "./tokens";

interface SignInResult {
  access: string;
  refresh: string;
  user: { id: string; email: string; full_name: string; avatar_url?: string };
}

async function postJson(path: string, body: unknown): Promise<SignInResult> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Sign-in failed. Please try again.");
  return data as SignInResult;
}

function toSessionUser(result: SignInResult): User {
  return {
    id: result.user.id,
    email: result.user.email,
    name: result.user.full_name,
    image: result.user.avatar_url || null,
    access: result.access,
    refresh: result.refresh,
  };
}

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    id: "credentials",
    name: "Email and password",
    credentials: { email: { type: "email" }, password: { type: "password" } },
    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) return null;
      const result = await postJson("/api/v1/auth/login/", { email: credentials.email, password: credentials.password });
      return toSessionUser(result);
    },
  }),
];

/** Google sign-in is off until GOOGLE_SIGNIN_ENABLED=true and the OAuth client is set (here and in the API). */
export const googleEnabled =
  process.env.GOOGLE_SIGNIN_ENABLED === "true" && Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

if (googleEnabled) {
  providers.push(
    GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
  pages: { signIn: "/signin", error: "/signin" },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.provider === "google") {
        // Hand Google's ID token to the API, which verifies it and issues MannaBooks tokens.
        if (!account.id_token) throw new Error("Google did not return an ID token.");
        const result = await postJson("/api/v1/auth/google/", { id_token: account.id_token });
        user = toSessionUser(result);
      }
      if (user?.access) {
        token.access = user.access;
        token.refresh = user.refresh ?? "";
        token.accessExpires = expiresAt(user.access);
        token.user = { id: user.id, email: user.email ?? "", name: user.name ?? "", image: user.image ?? null };
      }
      // Refreshing happens in src/proxy.ts, before any page or API call reads the session.
      return token;
    },
    async session({ session, token }) {
      session.user = token.user;
      return session;
    },
  },
};
