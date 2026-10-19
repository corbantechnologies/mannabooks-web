"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { GoogleButton } from "@/components/google-button";
import { Button, Field, FormError, Input } from "@/components/ui";

export function SignInForm({
  callbackUrl,
  expired,
  oauthError,
  googleEnabled,
}: {
  callbackUrl: string;
  expired: boolean;
  oauthError?: string;
  googleEnabled: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(
    oauthError ? new Error(oauthError === "CredentialsSignin" ? "Wrong email or password." : "Sign-in failed. Please try again.") : null,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.ok) {
      router.replace(callbackUrl);
      router.refresh();
    } else {
      setError(new Error(res?.error && res.error !== "CredentialsSignin" ? res.error : "Wrong email or password."));
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Sign in</h1>
        {expired && <p className="mt-1 text-sm text-amber-700">Your session ended. Please sign in again.</p>}
      </div>
      {googleEnabled && (
        <>
          <GoogleButton callbackUrl={callbackUrl} />
          <div className="flex items-center gap-3 text-xs text-stone-400">
            <span className="h-px flex-1 bg-stone-200" /> or <span className="h-px flex-1 bg-stone-200" />
          </div>
        </>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <FormError error={error} />
        <Button type="submit" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>
      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-stone-600 hover:underline">
          Forgot password?
        </Link>
        <Link href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-medium text-brand-700 hover:underline">
          Create an account
        </Link>
      </div>
    </div>
  );
}
