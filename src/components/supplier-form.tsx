"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { api, fieldError, unwrap } from "@/lib/api/client";
import type { Supplier } from "@/lib/api/types";
import { useWorkspace, wsPath } from "@/lib/workspace";

import { Button, Field, FormError, Input, Select, Textarea } from "./ui";

export function SupplierForm({ supplier, onSaved, onCancel }: { supplier?: Supplier; onSaved: (s: Supplier) => void; onCancel: () => void }) {
  const { slug } = useWorkspace();
  const wht = useQuery({
    queryKey: ["tax-rates", slug, "withholding"],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/tax-rates/", { params: { path: { workspace: slug }, query: { kind: "withholding_tax", is_active: true } } })),
  });
  const [form, setForm] = useState({
    name: supplier?.name ?? "", kind: (supplier?.kind ?? "company") as "company" | "individual", email: supplier?.email ?? "", phone: supplier?.phone ?? "",
    kra_pin: supplier?.kra_pin ?? "", address: supplier?.address ?? "", city: supplier?.city ?? "", payment_terms_days: supplier?.payment_terms_days ?? 30,
    withholding_tax_rate_id: supplier?.withholding_tax_rate_id ?? "", bank_details: supplier?.bank_details ?? "", notes: supplier?.notes ?? "",
    is_active: supplier?.is_active ?? true,
  });
  const save = useMutation({
    mutationFn: async () => {
      const body = { ...form, withholding_tax_rate_id: form.withholding_tax_rate_id || null };
      return supplier
        ? unwrap(await api.PATCH("/api/v1/w/{workspace}/suppliers/{id}/", { params: { path: { workspace: slug, id: supplier.id } }, body }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/suppliers/", { ...wsPath(slug), body }));
    },
    onSuccess: onSaved,
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: key === "payment_terms_days" ? Number(e.target.value) : e.target.value }));
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2"><Field label="Name" error={fieldError(save.error, "name")}><Input required value={form.name} onChange={set("name")} /></Field></div>
        <Field label="Type"><Select value={form.kind} onChange={set("kind")}><option value="company">Company</option><option value="individual">Individual</option></Select></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone"><Input value={form.phone} onChange={set("phone")} /></Field>
        <Field label="Email" error={fieldError(save.error, "email")}><Input type="email" value={form.email} onChange={set("email")} /></Field>
        <Field label="KRA PIN" error={fieldError(save.error, "kra_pin")}><Input value={form.kra_pin} onChange={set("kra_pin")} /></Field>
        <Field label="Days to pay them"><Input type="number" min={0} value={form.payment_terms_days} onChange={set("payment_terms_days")} /></Field>
        <div className="col-span-2">
          <Field label="Withholding tax" hint="Deducted when you pay them, e.g. professional fees. Sent to KRA by you." error={fieldError(save.error, "withholding_tax_rate_id")}>
            <Select value={form.withholding_tax_rate_id} onChange={set("withholding_tax_rate_id")}>
              <option value="">None</option>
              {(wht.data?.results ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </Field>
        </div>
      </div>
      <Field label="Bank or M-Pesa details for payments"><Textarea rows={2} value={form.bank_details} onChange={set("bank_details")} /></Field>
      <Field label="Address"><Textarea rows={2} value={form.address} onChange={set("address")} /></Field>
      {supplier && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} /> Active</label>}
      <FormError error={save.error} />
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
    </form>
  );
}
