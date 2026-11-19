"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { TopBar } from "@/components/top-bar";
import { Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, PasswordInput, Spinner } from "@/components/ui";
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
  const [changing, setChanging] = useState(false);

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
          <Field label="Email" hint="Your email is your sign-in. Use Change email to move to another address.">
            <div className="flex gap-2">
              <Input value={user.email} disabled />
              <Button type="button" variant="secondary" className="shrink-0" onClick={() => setChanging(true)}>Change email</Button>
            </div>
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
      {changing && <ChangeEmail user={user} onClose={() => setChanging(false)} />}
    </div>
  );
}

function ChangeEmail({ user, onClose }: { user: User; onClose: () => void }) {
  const [f, setF] = useState({ new_email: "", password: "" });
  const [sentTo, setSentTo] = useState("");
  const send = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/auth/email/change/", { body: f })),
    onSuccess: () => setSentTo(f.new_email.trim().toLowerCase()),
  });
  return (
    <Modal open title="Change your email" onClose={onClose}>
      {sentTo ? (
        <div className="space-y-4 text-sm text-stone-700">
          <p>We sent a link to <span className="font-medium text-stone-900">{sentTo}</span>. Open it to finish. Until then you keep signing in with {user.email}.</p>
          <p className="text-stone-500">Not there in a few minutes? Check spam, and that the address is spelled right.</p>
          <div className="flex justify-end"><Button onClick={onClose}>Done</Button></div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
          <p className="text-sm text-stone-600">We&apos;ll email a link to the new address. Your email changes only when you open it, so a typo can&apos;t lock you out.</p>
          <Field label="New email" error={fieldError(send.error, "new_email")}>
            <Input type="email" required autoComplete="email" value={f.new_email} onChange={(e) => setF((p) => ({ ...p, new_email: e.target.value }))} />
          </Field>
          {user.has_password && (
            <Field label="Your password" error={fieldError(send.error, "password")}>
              <PasswordInput required autoComplete="current-password" value={f.password} onChange={(e) => setF((p) => ({ ...p, password: e.target.value }))} />
            </Field>
          )}
          <FormError error={send.error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={send.isPending}>Send the link</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
