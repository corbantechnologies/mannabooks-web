import type { Metadata } from "next";

import { googleEnabled } from "@/lib/auth/options";

import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  return <SignUpForm callbackUrl={params.callbackUrl || "/workspaces"} googleEnabled={googleEnabled} />;
}
