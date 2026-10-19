"use client";

import Link from "next/link";
import { useState } from "react";

import { Button, Field, FormError, Input } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      unwrap(await api.POST("/api/v1/auth/password/reset/", { body: { email } }));
      setSent(true);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold">Check your email</h1>
        <p className="text-sm text-stone-600">If {email} has an account, a reset link is on its way. It works for 3 days.</p>
        <Link href="/signin" className="text-sm font-medium text-brand-700 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-lg font-semibold">Reset your password</h1>
      <Field label="Email">
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <FormError error={error} />
      <Button type="submit" className="w-full" loading={loading}>
        Send reset link
      </Button>
      <Link href="/signin" className="block text-center text-sm text-stone-600 hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}
