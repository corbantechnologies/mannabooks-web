"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { GoogleButton } from "@/components/google-button";
import { Button, Field, FormError, Input, PasswordInput } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";

export function SignUpForm({ callbackUrl, googleEnabled }: { callbackUrl: string; googleEnabled: boolean }) {
  const router = useRouter();
  // Someone accepting an invitation joins an existing workspace, so they don't create one of their own.
  const joiningByInvitation = callbackUrl.startsWith("/invite/");
  const [form, setForm] = useState({ full_name: "", email: "", password: "", business_name: "" });  // phone: later, in My account
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState<unknown>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body = joiningByInvitation ? { ...form, business_name: "" } : form;
      setStep(joiningByInvitation ? "Creating your account..." : "Creating your account and business...");
      const created = unwrap(await api.POST("/api/v1/auth/register/", { body }));
      setStep("Signing you in...");
      const res = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      if (!res?.ok) throw new Error("Your account was created. Please sign in.");
      setStep("Opening your workspace...");
      toast.success(created.workspace_slug ? `Welcome to MannaBooks! ${form.business_name} is ready.` : "Welcome to MannaBooks!", { duration: 6000 });
      router.replace(created.workspace_slug ? `/w/${created.workspace_slug}` : callbackUrl);
      router.refresh();
    } catch (err) {
      setError(err);
      setLoading(false);
      setStep("");
    }
  }

  return (
    <div className="space-y-5" data-wide>
      <div>
        <h1 className="text-lg font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-stone-600">
          {joiningByInvitation ? "Then accept your invitation." : "Every feature free for 30 days. No card needed."}
        </p>
      </div>
      {googleEnabled && (
        <>
          <GoogleButton callbackUrl={callbackUrl} label="Sign up with Google" />
          <div className="flex items-center gap-3 text-xs text-stone-400">
            <span className="h-px flex-1 bg-stone-200" /> or <span className="h-px flex-1 bg-stone-200" />
          </div>
        </>
      )}
      <form onSubmit={onSubmit} className="space-y-3.5">
        <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-x-4">
          <Field label="Your name" error={fieldError(error, "full_name")}>
            <Input required autoComplete="name" value={form.full_name} onChange={set("full_name")} />
          </Field>
          <Field label="Email" error={fieldError(error, "email")}>
            <Input type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
          </Field>
          {!joiningByInvitation && (
            <Field label="Business name" error={fieldError(error, "business_name")}>
              <Input required autoComplete="organization" value={form.business_name} onChange={set("business_name")} placeholder="e.g. Acme Traders Ltd" />
            </Field>
          )}
          <Field label="Password" error={fieldError(error, "password")} hint="At least 8 characters.">
            <PasswordInput required autoComplete="new-password" value={form.password} onChange={set("password")} />
          </Field>
        </div>
        <FormError error={error} />
        <Button type="submit" className="w-full" loading={loading}>
          {step || "Create account"}
        </Button>
        <p className="text-center text-xs text-stone-500">
          By signing up you agree to the <Link href="/terms" className="underline">terms</Link> and <Link href="/privacy" className="underline">privacy policy</Link>.
        </p>
      </form>
      <p className="text-center text-sm text-stone-600">
        Already have an account?{" "}
        <Link href={`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-medium text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
