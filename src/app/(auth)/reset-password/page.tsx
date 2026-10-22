"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button, Field, FormError, PasswordInput } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";

function ResetForm() {
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      unwrap(
        await api.POST("/api/v1/auth/password/reset/confirm/", {
          body: { uid: uid ?? "", token: token ?? "", new_password: password },
        }),
      );
      setDone(true);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  const uid = params.get("uid");
  const token = params.get("token");
  if (!uid || !token) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold">This link is incomplete</h1>
        <p className="text-sm text-stone-600">Open the link from the email exactly as it is, or ask for a new one.</p>
        <Link href="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">Send me a new reset link</Link>
      </div>
    );
  }
  const expired = Boolean(fieldError(error, "token"));
  if (done) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold">Password changed</h1>
        <Link href="/signin" className="text-sm font-medium text-brand-700 hover:underline">
          Sign in with your new password
        </Link>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-lg font-semibold">Choose a new password</h1>
      <Field label="New password" hint="At least 8 characters; not too common." error={fieldError(error, "new_password")}>
        <PasswordInput required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      {expired ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          This reset link has expired or was already used. <Link href="/forgot-password" className="font-medium underline">Send me a new one</Link>.
        </p>
      ) : !fieldError(error, "new_password") && <FormError error={error} />}
      <Button type="submit" className="w-full" loading={loading}>
        Save password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
