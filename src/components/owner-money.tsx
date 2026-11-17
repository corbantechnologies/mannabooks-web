"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Field, FormError, Input, Modal, Select, Textarea } from "@/components/ui";
import { useBankAccounts } from "@/lib/api/banking";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { OWNER_BALANCES, OWNER_KINDS, OWNER_ROLES, useOwners } from "@/lib/api/owners";
import type { components } from "@/lib/api/schema";
import { todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

type Owner = components["schemas"]["Owner"];

/** Record money between the business and an owner or director: capital, shares, loans either way, drawings, or a balance from before. */
export function OwnerMoneyModal({ ownerId, onClose }: { ownerId?: string; onClose: () => void }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const owners = useOwners(slug);
  const banks = useBankAccounts(slug);
  const [form, setForm] = useState({
    owner_id: ownerId ?? "", kind: "loan_in", opening_balance: "owed_to", transaction_date: todayIso(), bank_account_id: "", amount: "",
    share_count: "", share_premium: "", repay_by: "", reference: "", notes: "", allow_over: false,
  });
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/owners/transactions/", {
      ...wsPath(slug),
      body: {
        ...form, bank_account_id: form.kind === "opening" ? null : form.bank_account_id || null, opening_balance: form.kind === "opening" ? form.opening_balance : "",
        share_count: form.kind === "shares" && form.share_count ? Number(form.share_count) : null, share_premium: form.kind === "shares" ? form.share_premium || "0" : "0",
        repay_by: form.kind === "loan_in" || form.kind === "loan_out" ? form.repay_by || null : null,
      } as never,
    })),
    onSuccess: (t) => {
      toast.success(`${t.number} recorded`);
      void qc.invalidateQueries({ queryKey: ["owners", slug] });
      void qc.invalidateQueries({ queryKey: ["owner-statement", slug] });
      void qc.invalidateQueries({ queryKey: ["owner-transactions", slug] });
      onClose();
    },
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const kind = OWNER_KINDS.find((k) => k.value === form.kind);
  const over = save.error?.message.includes("record it anyway");
  return (
    <Modal open title="Owners' and directors' money" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Who" error={fieldError(save.error, "owner_id")}>
            <Select required value={form.owner_id} onChange={set("owner_id")}>
              <option value="">Choose</option>
              {(owners.data?.results ?? []).filter((o) => o.is_active).map((o) => <option key={o.id} value={o.id}>{o.name} ({o.role_label})</option>)}
            </Select>
          </Field>
          <Field label="What happened" hint={form.kind === "opening" ? "A balance from before you used MannaBooks. It posts nothing: the total belongs in your opening balances." : kind?.hint}>
            <Select value={form.kind} onChange={set("kind")}>
              <optgroup label="Money in">{OWNER_KINDS.filter((k) => k.in).map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</optgroup>
              <optgroup label="Money out">{OWNER_KINDS.filter((k) => !k.in).map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</optgroup>
              <optgroup label="Before MannaBooks"><option value="opening">Balance brought forward</option></optgroup>
            </Select>
          </Field>
          {form.kind === "opening" ? (
            <Field label="Which balance">
              <Select value={form.opening_balance} onChange={set("opening_balance")}>{OWNER_BALANCES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}</Select>
            </Field>
          ) : (
            <Field label={kind?.in ? "Paid into" : "Paid from"} error={fieldError(save.error, "bank_account_id")}>
              <Select required value={form.bank_account_id} onChange={set("bank_account_id")}>
                <option value="">Choose</option>
                {(banks.data?.results ?? []).filter((a) => a.is_active).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Amount" error={fieldError(save.error, "amount")}><Input required inputMode="decimal" value={form.amount} onChange={set("amount")} /></Field>
          <Field label="Date"><Input type="date" value={form.transaction_date} onChange={set("transaction_date")} /></Field>
          <Field label="Reference" hint="Bank or M-Pesa reference, resolution number..."><Input value={form.reference} onChange={set("reference")} /></Field>
          {form.kind === "shares" && <>
            <Field label="Number of shares"><Input inputMode="numeric" value={form.share_count} onChange={set("share_count")} /></Field>
            <Field label="Share premium" hint="The part of the amount paid above the shares' face value. Blank: none."><Input inputMode="decimal" value={form.share_premium} onChange={set("share_premium")} /></Field>
          </>}
          {(form.kind === "loan_in" || form.kind === "loan_out") && <Field label="To be repaid by" hint="If a date was agreed."><Input type="date" value={form.repay_by} onChange={set("repay_by")} /></Field>}
        </div>
        <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={set("notes")} /></Field>
        {over && (
          <label className="flex items-center gap-2 text-sm text-amber-800">
            <input type="checkbox" checked={form.allow_over} onChange={(e) => setForm((p) => ({ ...p, allow_over: e.target.checked }))} /> I&apos;ve checked: record it anyway
          </label>
        )}
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Record</Button></div>
      </form>
    </Modal>
  );
}

/** Add or edit an owner, partner, director or shareholder. */
export function OwnerEditor({ owner, onClose }: { owner: Owner | "new"; onClose: () => void }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const o = owner === "new" ? null : owner;
  const [form, setForm] = useState({ name: o?.name ?? "", role: o?.role ?? "director", phone: o?.phone ?? "", email: o?.email ?? "", id_number: o?.id_number ?? "",
    kra_pin: o?.kra_pin ?? "", notes: o?.notes ?? "", is_active: o?.is_active ?? true });
  const save = useMutation({
    mutationFn: async () => o
      ? unwrap(await api.PATCH("/api/v1/w/{workspace}/owners/{id}/", { params: { path: { workspace: slug, id: o.id } }, body: form as never }))
      : unwrap(await api.POST("/api/v1/w/{workspace}/owners/", { ...wsPath(slug), body: form as never })),
    onSuccess: () => { toast.success("Saved"); void qc.invalidateQueries({ queryKey: ["owners", slug] }); void qc.invalidateQueries({ queryKey: ["owner-statement", slug] }); onClose(); },
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [key]: e.target.value }));
  return (
    <Modal open title={o ? `Edit ${o.name}` : "Add an owner or director"} onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" error={fieldError(save.error, "name")}><Input required value={form.name} onChange={set("name")} /></Field>
          <Field label="Role"><Select value={form.role} onChange={set("role")}>{OWNER_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</Select></Field>
          <Field label="Phone"><Input value={form.phone} onChange={set("phone")} /></Field>
          <Field label="Email" error={fieldError(save.error, "email")}><Input type="email" value={form.email} onChange={set("email")} /></Field>
          <Field label="ID or passport number"><Input value={form.id_number} onChange={set("id_number")} /></Field>
          <Field label="KRA PIN"><Input value={form.kra_pin} onChange={set("kra_pin")} /></Field>
        </div>
        <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={set("notes")} /></Field>
        {o && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} /> Still involved in the business</label>}
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
      </form>
    </Modal>
  );
}
