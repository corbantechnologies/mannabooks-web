"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { api, fieldError, unwrap } from "@/lib/api/client";
import { usePriceLists } from "@/lib/api/sales";
import type { Customer } from "@/lib/api/types";
import { useWorkspace, wsPath } from "@/lib/workspace";

import { Button, Field, FormError, Input, Select, Textarea } from "./ui";

export function CustomerForm({ customer, onSaved, onCancel }: { customer?: Customer; onSaved: (c: Customer) => void; onCancel: () => void }) {
  const { slug } = useWorkspace();
  const [form, setForm] = useState({
    name: customer?.name ?? "", kind: (customer?.kind ?? "company") as "company" | "individual", email: customer?.email ?? "",
    phone: customer?.phone ?? "", kra_pin: customer?.kra_pin ?? "", address: customer?.address ?? "", city: customer?.city ?? "",
    payment_terms_days: customer?.payment_terms_days ?? 0, price_list_id: customer?.price_list_id ?? "", credit_limit: customer?.credit_limit ?? "0", notes: customer?.notes ?? "",
    is_active: customer?.is_active ?? true,
  });
  const priceLists = usePriceLists(slug);
  const save = useMutation({
    mutationFn: async () => {
      const body = { ...form, price_list_id: form.price_list_id || null };
      return customer
        ? unwrap(await api.PATCH("/api/v1/w/{workspace}/customers/{id}/", { params: { path: { workspace: slug, id: customer.id } }, body }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/customers/", { ...wsPath(slug), body }));
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
        <Field label="Phone" error={fieldError(save.error, "phone")}><Input value={form.phone} onChange={set("phone")} /></Field>
        <Field label="Email" error={fieldError(save.error, "email")}><Input type="email" value={form.email} onChange={set("email")} /></Field>
        <Field label="KRA PIN" error={fieldError(save.error, "kra_pin")} hint="Needed on invoices to VAT-registered customers."><Input value={form.kra_pin} onChange={set("kra_pin")} /></Field>
        <Field label="Town or city" error={fieldError(save.error, "city")}><Input value={form.city} onChange={set("city")} /></Field>
        <Field label="Days to pay" error={fieldError(save.error, "payment_terms_days")} hint="0 means due when invoiced."><Input type="number" min={0} value={form.payment_terms_days} onChange={set("payment_terms_days")} /></Field>
        <Field label="Credit limit" error={fieldError(save.error, "credit_limit")} hint="0 means no limit."><Input inputMode="decimal" value={form.credit_limit} onChange={set("credit_limit")} /></Field>
        <Field label="Price list" error={fieldError(save.error, "price_list_id")} hint="Special prices, e.g. wholesale.">
          <Select value={form.price_list_id} onChange={set("price_list_id")}>
            <option value="">Normal prices</option>
            {(priceLists.data?.results ?? []).filter((p) => p.is_active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Address" error={fieldError(save.error, "address")}><Textarea value={form.address} onChange={set("address")} /></Field>
      {customer && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} /> Active</label>}
      <FormError error={save.error} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={save.isPending}>Save</Button>
      </div>
    </form>
  );
}
