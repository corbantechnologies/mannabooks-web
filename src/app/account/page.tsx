"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { TopBar } from "@/components/top-bar";
import { Button, Card, ErrorState, Field, FormError, Input, PageHeader, PasswordInput, Spinner } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import type { User } from "@/lib/api/types";

export default function AccountPage() {
  const me = useQuery({ queryKey: ["me"], queryFn: async () => unwrap(await api.GET("/api/v1/auth/me/")) });
  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <PageHeader title="My account" description="Your sign-in details apply to every workspace you belong to." />
        {me.isLoading ? <Spinner /> : me.error ? <ErrorState error={me.error} /> : <AccountForms user={me.data!} />}
      </main>
    </>
  );
}

function AccountForms({ user }: { user: User }) {
  const [profile, setProfile] = useState({ full_name: user.full_name, phone: user.phone || "" });
  const [pw, setPw] = useState({ current_password: "", new_password: "" });

  const save = useMutation({
    mutationFn: async () => unwrap(await api.PATCH("/api/v1/auth/me/", { body: profile })),
    onSuccess: () => toast.success("Profile saved"),
  });
  const changePw = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/auth/password/change/", { body: pw })),
    onSuccess: () => {
      toast.success("Password changed");
      setPw({ current_password: "", new_password: "" });
    },
  });

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <h2 className="font-semibold">Profile</h2>
          <Field label="Email" hint="Your email is your sign-in and can't be changed here.">
            <Input value={user.email} disabled />
          </Field>
          <Field label="Full name" error={fieldError(save.error, "full_name")}>
            <Input required value={profile.full_name} onChange={(e) => setProfile((prev) => ({ ...prev, full_name: e.target.value }))} />
          </Field>
          <Field label="Phone" error={fieldError(save.error, "phone")}>
            <Input value={profile.phone} onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))} />
          </Field>
          <FormError error={save.error} />
          <Button type="submit" loading={save.isPending}>
            Save profile
          </Button>
        </form>
      </Card>
      <Card className="p-5">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            changePw.mutate();
          }}
        >
          <h2 className="font-semibold">{user.has_password ? "Change password" : "Set a password"}</h2>
          {!user.has_password && <p className="text-sm text-stone-600">You sign in with Google. A password lets you sign in with email too.</p>}
          {user.has_password && (
            <Field label="Current password" error={fieldError(changePw.error, "current_password")}>
              <PasswordInput autoComplete="current-password" value={pw.current_password} onChange={(e) => setPw((prev) => ({ ...prev, current_password: e.target.value }))} />
            </Field>
          )}
          <Field label="New password" error={fieldError(changePw.error, "new_password")}>
            <PasswordInput autoComplete="new-password" required value={pw.new_password} onChange={(e) => setPw((prev) => ({ ...prev, new_password: e.target.value }))} />
          </Field>
          <FormError error={changePw.error} />
          <Button type="submit" loading={changePw.isPending}>
            Save password
          </Button>
        </form>
      </Card>
    </div>
  );
}
