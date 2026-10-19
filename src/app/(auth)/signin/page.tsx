import type { Metadata } from "next";

import { googleEnabled } from "@/lib/auth/options";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  return (
    <SignInForm
      callbackUrl={params.callbackUrl || "/workspaces"}
      expired={params.expired === "1"}
      oauthError={params.error}
      googleEnabled={googleEnabled}
    />
  );
}
