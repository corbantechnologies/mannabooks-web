"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button, FormError } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";

function Confirm() {
  const token = useSearchParams().get("token");
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function confirm() {
    setLoading(true);
    setError(null);
    try {
      const user = unwrap(await api.POST("/api/v1/auth/email/change/confirm/", { body: { token: token ?? "" } }));
      setEmail(user.email);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold">This link is incomplete</h1>
        <p className="text-sm text-stone-600">Open the link from the email exactly as it is, or ask for a new one from My account.</p>
      </div>
    );
  }
  if (email) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold">Email changed</h1>
        <p className="text-sm text-stone-600">You now sign in with <span className="font-medium text-stone-900">{email}</span>. Your password stays the same.</p>
        <Link href="/signin" className="text-sm font-medium text-brand-700 hover:underline">Go to sign in</Link>
      </div>
    );
  }
  const bad = fieldError(error, "token");
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Confirm your new email</h1>
      <p className="text-sm text-stone-600">After this you sign in to MannaBooks with the new address, and emails about your work go there.</p>
      {bad ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{bad}</p> : <FormError error={error} />}
      <Button className="w-full" loading={loading} onClick={() => void confirm()}>Confirm my new email</Button>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense>
      <Confirm />
    </Suspense>
  );
}
