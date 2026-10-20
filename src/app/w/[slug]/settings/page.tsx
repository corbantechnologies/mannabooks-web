"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { PaymentOptions } from "@/components/payment-options";
import { Button, Card, Field, FormError, Input, PageHeader, Select, Table, Td, Textarea } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { useWorkspace, wsPath } from "@/lib/workspace";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function SettingsPage() {
  const { slug, context, can } = useWorkspace();
  const router = useRouter();
  const p = wsPath(slug);
  const ws = context.workspace;
  const [form, setForm] = useState({
    name: ws.name, legal_name: ws.legal_name ?? "", kra_pin: ws.kra_pin ?? "", vat_registered: !!ws.vat_registered,
    vat_number: ws.vat_number ?? "", currency: ws.currency ?? "KES", phone: ws.phone ?? "", email: ws.email ?? "",
    address: ws.address ?? "", fiscal_year_start_month: ws.fiscal_year_start_month ?? 1,
  });

  const save = useMutation({
    mutationFn: async () => unwrap(await api.PATCH("/api/v1/w/{workspace}/", { ...p, body: form })),
    onSuccess: () => toast.success("Settings saved"),
  });
  const sequences = useQuery({ queryKey: ["sequences", slug], enabled: can("sequences.view"), queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/sequences/", p)) });
  const updateSeq = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: { prefix?: string; next_number?: number; padding?: number; include_year?: boolean } }) =>
      unwrap(await api.PATCH("/api/v1/w/{workspace}/sequences/{id}/", { params: { path: { workspace: slug, id } }, body })),
    onSuccess: () => toast.success("Numbering saved"),
    onError: (e) => toast.error(e.message),
  });
  const destroy = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/w/{workspace}/", p)),
    onSuccess: () => { toast.success("Workspace deleted"); router.replace("/workspaces"); },
    onError: (e) => toast.error(e.message),
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: key === "fiscal_year_start_month" ? Number(e.target.value) : e.target.value }));

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Your business details appear on documents and KRA submissions." guide="workspace-settings" />
      <Card className="p-5">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <h2 className="font-semibold">Business details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Business name" error={fieldError(save.error, "name")}><Input required value={form.name} onChange={set("name")} /></Field>
            <Field label="Registered (legal) name" error={fieldError(save.error, "legal_name")}><Input value={form.legal_name} onChange={set("legal_name")} /></Field>
            <Field label="KRA PIN" error={fieldError(save.error, "kra_pin")}><Input value={form.kra_pin} onChange={set("kra_pin")} placeholder="P051234567X" maxLength={11} autoCapitalize="characters" className="uppercase" /></Field>
            <Field label="Currency" error={fieldError(save.error, "currency")}><Input value={form.currency} onChange={set("currency")} maxLength={3} /></Field>
            <Field label="Phone" error={fieldError(save.error, "phone")}><Input value={form.phone} onChange={set("phone")} /></Field>
            <Field label="Email" error={fieldError(save.error, "email")}><Input type="email" value={form.email} onChange={set("email")} /></Field>
            <Field label="Financial year starts in" error={fieldError(save.error, "fiscal_year_start_month")}>
              <Select value={form.fiscal_year_start_month} onChange={set("fiscal_year_start_month")}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Address" error={fieldError(save.error, "address")}><Textarea value={form.address} onChange={set("address")} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.vat_registered} onChange={(e) => setForm((prev) => ({ ...prev, vat_registered: e.target.checked }))} /> Registered for VAT</label>
          {form.vat_registered && (
            <Field label="VAT number" error={fieldError(save.error, "vat_number")}><Input value={form.vat_number} onChange={set("vat_number")} /></Field>
          )}
          <FormError error={save.error} />
          <Button type="submit" loading={save.isPending}>Save settings</Button>
        </form>
      </Card>

      <PaymentOptions />

      {can("sequences.view") && (
        <Card>
          <div className="p-5 pb-2">
            <h2 className="font-semibold">Numbering</h2>
            <p className="mt-1 text-sm text-stone-600">How records are numbered. Each kind appears here the first time it is used. Numbers only go up, so none is ever reused.</p>
          </div>
          <Table head={["Numbers", "Prefix", "Next number", "Next looks like"]}>
            {(sequences.data?.results ?? []).map((s) => (
              <tr key={s.id}>
                <Td className="capitalize">{s.key}</Td>
                <Td>
                  <Input className="max-w-28 py-1" defaultValue={s.prefix} disabled={!can("sequences.manage")} onBlur={(e) => e.target.value !== s.prefix && updateSeq.mutate({ id: s.id, body: { prefix: e.target.value } })} />
                </Td>
                <Td>
                  <Input type="number" className="max-w-28 py-1" defaultValue={s.next_number} disabled={!can("sequences.manage")} onBlur={(e) => Number(e.target.value) !== s.next_number && updateSeq.mutate({ id: s.id, body: { next_number: Number(e.target.value) } })} />
                </Td>
                <Td className="font-mono text-xs">{s.preview}</Td>
              </tr>
            ))}
            {sequences.data?.results.length === 0 && <tr><Td colSpan={4} className="text-stone-500">Nothing numbered yet.</Td></tr>}
          </Table>
        </Card>
      )}

      {context.is_owner && (
        <Card className="border-red-200 p-5">
          <h2 className="font-semibold text-red-700">Delete workspace</h2>
          <p className="mt-1 text-sm text-stone-600">Removes {ws.name} for everyone. The records are kept for audit but nobody can open it.</p>
          <Button variant="danger" className="mt-3" loading={destroy.isPending} onClick={() => prompt(`Type ${ws.name} to delete it.`) === ws.name && destroy.mutate()}>
            Delete {ws.name}
          </Button>
        </Card>
      )}
    </div>
  );
}
