"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Network, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { TopBar } from "@/components/top-bar";
import { Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Spinner } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";

export default function GroupsPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", currency: "KES" });
  const list = useQuery({ queryKey: ["groups"], queryFn: async () => unwrap(await api.GET("/api/v1/groups/")) });
  const create = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/groups/", { body: form })),
    onSuccess: (g) => router.push(`/groups/${g.id}`),
  });
  const groups = list.data?.results ?? [];
  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link href="/workspaces" className="text-sm text-stone-500 hover:underline">&larr; Your workspaces</Link>
        <PageHeader title="Company groups" guide="company-groups"
          description="Several businesses you own, reported on together: one profit and loss and balance sheet, with what they sell to and lend each other taken out."
          actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New group</Button>} />
        {list.isLoading ? <Spinner /> : list.error ? <ErrorState error={list.error} /> : groups.length === 0 ? (
          <Card><EmptyState title="No groups yet">Create a group, then add the workspaces of the businesses it owns.</EmptyState></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.map((g) => (
              <Link key={g.id} href={`/groups/${g.id}`}>
                <Card className="flex items-center gap-3 p-4 transition-colors hover:border-brand-600">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-50 text-brand-700"><Network className="h-5 w-5" /></span>
                  <span>
                    <span className="block font-medium text-stone-900">{g.name}</span>
                    <span className="block text-sm text-stone-500">{g.companies.length} {g.companies.length === 1 ? "company" : "companies"} · {g.currency}</span>
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        )}
        <Modal open={open} title="New company group" onClose={() => setOpen(false)}>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
            <Field label="Group name" error={fieldError(create.error, "name")}><Input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Kamau Holdings" /></Field>
            <Field label="Reporting currency" hint="Every company in the group must keep its books in this currency." error={fieldError(create.error, "currency")}>
              <Input maxLength={3} value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))} />
            </Field>
            <FormError error={create.error} />
            <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={create.isPending}>Create</Button></div>
          </form>
        </Modal>
      </main>
    </>
  );
}
