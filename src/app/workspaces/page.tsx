"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { TopBar } from "@/components/top-bar";
import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";

export default function WorkspacesPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", kra_pin: "", currency: "KES" });

  const list = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => unwrap(await api.GET("/api/v1/workspaces/")),
  });
  const create = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/workspaces/", { body: form })),
    onSuccess: (ws) => router.push(`/w/${ws.slug}`),
  });

  const workspaces = list.data?.results ?? [];
  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <PageHeader
          title="Your workspaces"
          description="A workspace is one business. Open one, or create a new one for another business."
          guide="getting-started"
          actions={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> New workspace
            </Button>
          }
        />
        {list.isLoading ? (
          <Spinner />
        ) : list.error ? (
          <ErrorState error={list.error} />
        ) : workspaces.length === 0 ? (
          <Card>
            <EmptyState title="No workspaces yet">
              Create your business workspace to get started, or open the invitation link a colleague sent you.
              <div className="mt-4">
                <Button onClick={() => setOpen(true)}>Create my workspace</Button>
              </div>
            </EmptyState>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {workspaces.map((ws) => (
              <Link key={ws.id} href={`/w/${ws.slug}`}>
                <Card className="flex items-center gap-3 p-4 transition-colors hover:border-brand-600">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-stone-900">{ws.name}</p>
                    <p className="text-xs text-stone-500">{ws.kra_pin || "No KRA PIN yet"}</p>
                  </div>
                  {ws.role && <Badge>{ws.role}</Badge>}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Modal open={open} title="New workspace" onClose={() => setOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <Field label="Business name" error={fieldError(create.error, "name")}>
            <Input required value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Acme Traders Ltd" />
          </Field>
          <Field label="KRA PIN (optional)" error={fieldError(create.error, "kra_pin")} hint="You can add it later in Settings.">
            <Input value={form.kra_pin} maxLength={11} autoCapitalize="characters" className="uppercase" onChange={(e) => setForm((prev) => ({ ...prev, kra_pin: e.target.value }))} placeholder="P051234567X" />
          </Field>
          <Field label="Currency" error={fieldError(create.error, "currency")}>
            <Select value={form.currency} onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}>
              <option value="KES">KES, Kenyan shilling</option>
              <option value="UGX">UGX, Ugandan shilling</option>
              <option value="TZS">TZS, Tanzanian shilling</option>
              <option value="USD">USD, US dollar</option>
            </Select>
          </Field>
          <FormError error={create.error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Create workspace
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
