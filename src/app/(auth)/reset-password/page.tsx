"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button, Field, FormError, Input } from "@/components/ui";
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
          body: { uid: params.get("uid") || "", token: params.get("token") || "", new_password: password },
        }),
      );
      setDone(true);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

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
      <Field label="New password" error={fieldError(error, "new_password") || fieldError(error, "token")}>
        <Input type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <FormError error={error} />
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
