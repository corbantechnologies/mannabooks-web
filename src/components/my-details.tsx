"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { api, unwrap } from "@/lib/api/client";
import type { Employee } from "@/lib/api/types";
import { useWorkspace, wsPath } from "@/lib/workspace";

import { Badge, Button, Card, Field, FormError, Input, Modal, Select, Spinner } from "./ui";

const LABEL: Record<string, string> = {
  national_id: "National ID", kra_pin: "KRA PIN", nssf_number: "NSSF number", shif_number: "SHIF number",
  pay_method: "Paid by", bank_name: "Bank", bank_account_number: "Bank account", mpesa_phone: "M-Pesa number",
};
const PAID_BY: Record<string, string> = { bank: "Bank transfer", mpesa: "M-Pesa", cash: "Cash" };

type Form = Record<string, string>;
const fromEmployee = (e: Employee): Form => ({
  phone: e.phone ?? "", email: e.email ?? "", emergency_contact_name: e.emergency_contact_name ?? "", emergency_contact_phone: e.emergency_contact_phone ?? "",
  national_id: e.national_id ?? "", kra_pin: e.kra_pin ?? "", nssf_number: e.nssf_number ?? "", shif_number: e.shif_number ?? "",
  pay_method: e.pay_method ?? "bank", bank_name: e.bank_name ?? "", bank_account_number: e.bank_account_number ?? "", mpesa_phone: e.mpesa_phone ?? "",
});

/** The staff member's own record: contact details change at once; ID numbers and where pay goes are checked by HR first. */
export function MyDetails() {
  const { slug } = useWorkspace();
  const me = useQuery({ queryKey: ["employee-me", slug], retry: false, queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/employees/me/", wsPath(slug))) });
  const [form, setForm] = useState<Form | null>(null);
  const save = useMutation({
    mutationFn: async (body: Form) => unwrap(await api.PATCH("/api/v1/w/{workspace}/employees/me/", { ...wsPath(slug), body: body as never })),
    onSuccess: (e) => {
      const waiting = Object.keys((e.pending_changes ?? {}) as object).filter((k) => k !== "requested_at").length;
      toast.success(waiting ? "Saved. HR will check the ID and pay details before they are used." : "Saved");
      setForm(null);
      void me.refetch();
    },
  });
  if (me.isLoading) return <Spinner />;
  if (me.error || !me.data) return null;
  const e = me.data;
  const pending = Object.entries((e.pending_changes ?? {}) as Record<string, string>).filter(([k]) => k !== "requested_at");
  const set = (k: string) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p) => ({ ...(p as Form), [k]: ev.target.value }));
  const row = (label: string, value?: string | null) => (
    <div className="flex justify-between gap-3 py-1.5 text-sm"><dt className="text-stone-500">{label}</dt><dd className="text-right">{value || "-"}</dd></div>
  );
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">My details</h2>
        <Button variant="ghost" className="px-2 py-1" onClick={() => { save.reset(); setForm(fromEmployee(e)); }}><Pencil className="h-4 w-4" /> Update</Button>
      </div>
      <Card className="p-4">
        <dl className="divide-y divide-stone-100">
          {row("Phone", e.phone)}
          {row("Email", e.email)}
          {row("Emergency contact", [e.emergency_contact_name, e.emergency_contact_phone].filter(Boolean).join(", "))}
          {row("KRA PIN", e.kra_pin)}
          {row("NSSF / SHIF", [e.nssf_number, e.shif_number].filter(Boolean).join(" / "))}
          {row("Paid by", e.pay_method ? `${PAID_BY[e.pay_method] ?? e.pay_method}${e.pay_method === "bank" && e.bank_account_number ? `, ${e.bank_name} ${e.bank_account_number}` : e.pay_method === "mpesa" && e.mpesa_phone ? `, ${e.mpesa_phone}` : ""}` : "")}
        </dl>
        {pending.length > 0 && (
          <div className="mt-3 rounded-md bg-amber-50 p-3 text-xs text-amber-900">
            <Badge tone="amber">Waiting for HR</Badge>
            <p className="mt-1">{pending.map(([k, v]) => `${LABEL[k] ?? k}: ${v || "(blank)"}`).join(" · ")}</p>
          </div>
        )}
      </Card>
      <Modal open={form !== null} title="Update my details" onClose={() => setForm(null)}>
        {form && (
          <form className="space-y-4" onSubmit={(ev) => { ev.preventDefault(); save.mutate(form); }}>
            <p className="text-sm font-medium text-stone-700">Contact <span className="font-normal text-stone-500">· saved at once</span></p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phone"><Input value={form.phone} onChange={set("phone")} /></Field>
              <Field label="Email"><Input type="email" value={form.email} onChange={set("email")} /></Field>
              <Field label="Emergency contact"><Input value={form.emergency_contact_name} onChange={set("emergency_contact_name")} placeholder="Name" /></Field>
              <Field label="Their phone"><Input value={form.emergency_contact_phone} onChange={set("emergency_contact_phone")} /></Field>
            </div>
            <p className="text-sm font-medium text-stone-700">ID numbers and pay <span className="font-normal text-stone-500">· checked by HR before use</span></p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="National ID"><Input value={form.national_id} onChange={set("national_id")} /></Field>
              <Field label="KRA PIN"><Input value={form.kra_pin} onChange={set("kra_pin")} className="uppercase" maxLength={11} /></Field>
              <Field label="NSSF number"><Input value={form.nssf_number} onChange={set("nssf_number")} /></Field>
              <Field label="SHIF number"><Input value={form.shif_number} onChange={set("shif_number")} /></Field>
              <Field label="Paid by"><Select value={form.pay_method} onChange={set("pay_method")}><option value="bank">Bank transfer</option><option value="mpesa">M-Pesa</option><option value="cash">Cash</option></Select></Field>
              {form.pay_method === "bank" && <Field label="Bank"><Input value={form.bank_name} onChange={set("bank_name")} /></Field>}
              {form.pay_method === "bank" && <Field label="Account number"><Input value={form.bank_account_number} onChange={set("bank_account_number")} /></Field>}
              {form.pay_method === "mpesa" && <Field label="M-Pesa number"><Input value={form.mpesa_phone} onChange={set("mpesa_phone")} /></Field>}
            </div>
            <p className="text-xs text-stone-500">If you change where your pay goes, we email you at the address we already have, so a change you didn&apos;t make is noticed.</p>
            <FormError error={save.error} />
            <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
          </form>
        )}
      </Modal>
    </section>
  );
}
