"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { api, fieldError, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { useWorkspace } from "@/lib/workspace";

import { Badge, Button, Card, EmptyState, Field, FormError, Input, Modal, Select } from "./ui";

type PaymentOption = components["schemas"]["PaymentOption"];
const KINDS = [
  { value: "mpesa_paybill", label: "M-Pesa paybill" }, { value: "mpesa_till", label: "M-Pesa till (Buy Goods)" },
  { value: "bank", label: "Bank account" }, { value: "pochi", label: "Pochi la Biashara" }, { value: "other", label: "Other" },
] as const;
const BLANK = { kind: "mpesa_paybill", bank_name: "", branch: "", account_name: "", account_number: "", swift_code: "", number: "", instructions: "", show_on_documents: true };

/** Settings: how customers pay the business. They print on invoices and quotations and show on customer links. */
export function PaymentOptions() {
  const { slug, can } = useWorkspace();
  const p = { params: { path: { workspace: slug } } };
  const manage = can("workspace.manage");
  const list = useQuery({ queryKey: ["payment-options", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/payment-options/", p)) });
  const [editing, setEditing] = useState<PaymentOption | "new" | null>(null);
  const [f, setF] = useState<typeof BLANK>(BLANK);
  const set = (k: keyof typeof BLANK) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = useMutation({
    mutationFn: async () => editing && editing !== "new"
      ? unwrap(await api.PATCH("/api/v1/w/{workspace}/payment-options/{id}/", { params: { path: { workspace: slug, id: editing.id } }, body: f as never }))
      : unwrap(await api.POST("/api/v1/w/{workspace}/payment-options/", { ...p, body: f as never })),
    onSuccess: () => { toast.success("Payment option saved"); setEditing(null); },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await api.DELETE("/api/v1/w/{workspace}/payment-options/{id}/", { params: { path: { workspace: slug, id } } })),
    onSuccess: () => { toast.success("Removed"); setEditing(null); },
  });
  function open(o: PaymentOption | "new") {
    save.reset();
    setEditing(o);
    setF(o === "new" ? BLANK : {
      kind: o.kind, bank_name: o.bank_name ?? "", branch: o.branch ?? "", account_name: o.account_name ?? "", account_number: o.account_number ?? "",
      swift_code: o.swift_code ?? "", number: o.number ?? "", instructions: o.instructions ?? "", show_on_documents: o.show_on_documents ?? true,
    });
  }
  const rows = list.data ?? [];
  const mobile = ["mpesa_paybill", "mpesa_till", "pochi"].includes(f.kind);
  return (
    <Card>
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div>
          <h2 className="font-semibold">How customers pay you</h2>
          <p className="text-sm text-stone-600">Printed on invoices and quotations, and shown on the links you send customers.</p>
        </div>
        {manage && <Button variant="secondary" onClick={() => open("new")}><Plus className="h-4 w-4" /> Add</Button>}
      </div>
      {rows.length === 0 ? <EmptyState title="No payment options yet">Add your paybill, till or bank account so customers know how to pay.</EmptyState> : (
        <div className="grid gap-3 p-5 pt-0 sm:grid-cols-2">
          {rows.map((o) => (
            <button key={o.id} type="button" disabled={!manage} onClick={() => open(o)}
              className="rounded-md border border-stone-200 p-3 text-left text-sm hover:border-brand-300 disabled:cursor-default">
              {o.lines.map((l) => <p key={l} className="text-stone-700">{l}</p>)}
              {!o.show_on_documents && <span className="mt-1 inline-block"><Badge>Not printed</Badge></span>}
            </button>
          ))}
        </div>
      )}
      <Modal open={editing !== null} title={editing === "new" ? "Add a payment option" : "Edit payment option"} onClose={() => setEditing(null)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <Field label="Type"><Select value={f.kind} onChange={set("kind")}>{KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</Select></Field>
          {f.kind === "bank" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Bank"><Input required value={f.bank_name} onChange={set("bank_name")} placeholder="Equity Bank" /></Field>
              <Field label="Branch"><Input value={f.branch} onChange={set("branch")} /></Field>
              <Field label="Account name"><Input value={f.account_name} onChange={set("account_name")} /></Field>
              <Field label="Account number" error={fieldError(save.error, "account_number")}><Input required value={f.account_number} onChange={set("account_number")} /></Field>
              <Field label="SWIFT code (optional)"><Input value={f.swift_code} onChange={set("swift_code")} /></Field>
            </div>
          )}
          {mobile && (
            <Field label={f.kind === "mpesa_paybill" ? "Paybill number" : f.kind === "mpesa_till" ? "Till number" : "Phone number"} error={fieldError(save.error, "number")}>
              <Input required value={f.number} onChange={set("number")} inputMode="numeric" />
            </Field>
          )}
          {f.kind === "mpesa_paybill" && (
            <Field label="Account number" hint="Blank: customers use the invoice number as the account."><Input value={f.account_number} onChange={set("account_number")} /></Field>
          )}
          <Field label={f.kind === "other" ? "How to pay" : "Note (optional)"} error={fieldError(save.error, "instructions")}>
            <Input value={f.instructions} onChange={set("instructions")} placeholder={f.kind === "other" ? "Cheques payable to ..." : ""} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.show_on_documents} onChange={(e) => setF((x) => ({ ...x, show_on_documents: e.target.checked }))} /> Print on invoices and quotations
          </label>
          <FormError error={save.error || remove.error} />
          <div className="flex justify-between gap-2">
            {editing && editing !== "new"
              ? <Button type="button" variant="ghost" className="text-red-600" onClick={() => confirm("Remove this payment option?") && remove.mutate(editing.id)}>Remove</Button>
              : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" loading={save.isPending}>Save</Button>
            </div>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
