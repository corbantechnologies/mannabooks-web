"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
    kra_pin: o?.kra_pin ?? "", notes: o?.notes ?? "", is_active: o?.is_active ?? true, membership_id: o?.membership_id ?? "" });
  const logins = useQuery({ queryKey: ["owner-logins", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/owners/logins/", wsPath(slug))) });
  const link = (id: string) => {
    const m = (logins.data ?? []).find((x) => x.id === id);
    setForm((p) => ({ ...p, membership_id: id, name: p.name || m?.full_name || "", email: p.email || m?.email || "", phone: p.phone || m?.phone || "" }));
  };
  const save = useMutation({
    mutationFn: async () => o
      ? unwrap(await api.PATCH("/api/v1/w/{workspace}/owners/{id}/", { params: { path: { workspace: slug, id: o.id } }, body: { ...form, membership_id: form.membership_id || null } as never }))
      : unwrap(await api.POST("/api/v1/w/{workspace}/owners/", { ...wsPath(slug), body: { ...form, membership_id: form.membership_id || null } as never })),
    onSuccess: () => { toast.success("Saved"); void qc.invalidateQueries({ queryKey: ["owners", slug] }); void qc.invalidateQueries({ queryKey: ["owner-statement", slug] }); onClose(); },
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [key]: e.target.value }));
  return (
    <Modal open title={o ? `Edit ${o.name}` : "Add an owner or director"} onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Field label="Their MannaBooks login (optional)" error={fieldError(save.error, "membership_id")}
          hint="If they use MannaBooks: their name and contacts fill in, they see their own account on their Me page, and they can't record their own money. The account stays here even if the login is removed.">
          <Select value={form.membership_id} onChange={(e) => link(e.target.value)}>
            <option value="">No login</option>
            {(logins.data ?? []).map((m) => (
              <option key={m.id} value={m.id} disabled={Boolean(m.linked_to) && m.id !== o?.membership_id}>
                {m.full_name} ({m.email}){m.linked_to && m.id !== o?.membership_id ? `: linked to ${m.linked_to}` : ""}
              </option>
            ))}
          </Select>
        </Field>
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

type BulkRow = {
  key: number; open: boolean; kind: string; opening_balance: string; transaction_date: string; bank_account_id: string; amount: string;
  share_count: string; share_premium: string; repay_by: string; reference: string; notes: string;
};

const money2 = (n: number) => n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Several records for one owner or director at once (a month of a director's money, say), each folding away when done. All or none are saved. */
export function OwnerBulkForm({ ownerId, ownerName, onClose }: { ownerId: string; ownerName: string; onClose: () => void }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const banks = useBankAccounts(slug);
  const active = (banks.data?.results ?? []).filter((a) => a.is_active);
  const [next, setNext] = useState(1);
  const blank = (key: number, from?: BulkRow): BulkRow => ({
    key, open: true, kind: from?.kind ?? "loan_in", opening_balance: "owed_to", transaction_date: from?.transaction_date ?? todayIso(),
    bank_account_id: from?.bank_account_id ?? "", amount: "", share_count: "", share_premium: "", repay_by: "", reference: "", notes: "",
  });
  const [rows, setRows] = useState<BulkRow[]>(() => [blank(0)]);
  const [allowOver, setAllowOver] = useState(false);
  const patch = (key: number, p: Partial<BulkRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const ready = (r: BulkRow) => Boolean(Number(r.amount) > 0 && r.transaction_date && (r.kind === "opening" || r.bank_account_id));
  const add = () => {
    const last = rows[rows.length - 1];
    setRows((rs) => [...rs.map((r) => (ready(r) ? { ...r, open: false } : r)), blank(next, last)]);
    setNext((n) => n + 1);
  };
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/owners/transactions/bulk/", {
      ...wsPath(slug),
      body: {
        rows: rows.map((f) => ({
          owner_id: ownerId, kind: f.kind, transaction_date: f.transaction_date, amount: f.amount, reference: f.reference, notes: f.notes, allow_over: allowOver,
          bank_account_id: f.kind === "opening" ? null : f.bank_account_id || null, opening_balance: f.kind === "opening" ? f.opening_balance : "",
          share_count: f.kind === "shares" && f.share_count ? Number(f.share_count) : null, share_premium: f.kind === "shares" ? f.share_premium || "0" : "0",
          repay_by: f.kind === "loan_in" || f.kind === "loan_out" ? f.repay_by || null : null,
        })),
      } as never,
    })),
    onSuccess: (made) => {
      toast.success(`${made.length} recorded`);
      void qc.invalidateQueries({ queryKey: ["owners", slug] });
      void qc.invalidateQueries({ queryKey: ["owner-statement", slug] });
      onClose();
    },
  });
  const total = (into: boolean) => rows
    .filter((r) => r.kind !== "opening" && Boolean(OWNER_KINDS.find((k) => k.value === r.kind)?.in) === into)
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const over = save.error?.message.includes("record it anyway");
  const label = (r: BulkRow) => (r.kind === "opening"
    ? `Brought forward: ${OWNER_BALANCES.find((b) => b.value === r.opening_balance)?.label ?? ""}`
    : OWNER_KINDS.find((k) => k.value === r.kind)?.label ?? r.kind);
  return (
    <Modal open title={`Record in bulk: ${ownerName}`} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <p className="text-sm text-stone-600">One record each: a loan in, a drawing, a repayment. Press Done to fold one away. Nothing is saved until you save them all, and if one has a problem none are saved.</p>
        {rows.map((r, i) => {
          const set = (key: keyof BulkRow) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => patch(r.key, { [key]: e.target.value });
          const kind = OWNER_KINDS.find((k) => k.value === r.kind);
          if (!r.open) {
            return (
              <div key={r.key} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => patch(r.key, { open: true })}>
                  <span className="font-medium">{i + 1}. {label(r)}</span>
                  <span className="ml-2 text-stone-600">{r.transaction_date}{r.kind === "opening" ? "" : ` · ${active.find((a) => a.id === r.bank_account_id)?.name ?? ""}`}{r.reference ? ` · ${r.reference}` : ""}</span>
                </button>
                <span className="font-mono">{money2(Number(r.amount) || 0)}</span>
                <span className="flex gap-3">
                  <button type="button" className="text-xs text-brand-700 hover:underline" onClick={() => patch(r.key, { open: true })}>Change</button>
                  <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>Remove</button>
                </span>
              </div>
            );
          }
          return (
            <div key={r.key} className="space-y-3 rounded-md border border-brand-200 p-3">
              <p className="text-sm font-semibold">Record {i + 1}</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="What happened" hint={r.kind === "opening" ? "A balance from before MannaBooks: posts nothing." : kind?.hint}>
                  <Select value={r.kind} onChange={set("kind")}>
                    <optgroup label="Money in">{OWNER_KINDS.filter((k) => k.in).map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</optgroup>
                    <optgroup label="Money out">{OWNER_KINDS.filter((k) => !k.in).map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</optgroup>
                    <optgroup label="Before MannaBooks"><option value="opening">Balance brought forward</option></optgroup>
                  </Select>
                </Field>
                {r.kind === "opening" ? (
                  <Field label="Which balance">
                    <Select value={r.opening_balance} onChange={set("opening_balance")}>{OWNER_BALANCES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}</Select>
                  </Field>
                ) : (
                  <Field label={kind?.in ? "Paid into" : "Paid from"}>
                    <Select required value={r.bank_account_id} onChange={set("bank_account_id")}><option value="">Choose</option>{active.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
                  </Field>
                )}
                <Field label="Amount"><Input required inputMode="decimal" value={r.amount} onChange={set("amount")} /></Field>
                <Field label="Date"><Input type="date" required value={r.transaction_date} onChange={set("transaction_date")} /></Field>
                <Field label="Reference"><Input value={r.reference} onChange={set("reference")} placeholder="Bank or M-Pesa reference" /></Field>
                {r.kind === "shares" && <>
                  <Field label="Number of shares"><Input inputMode="numeric" value={r.share_count} onChange={set("share_count")} /></Field>
                  <Field label="Share premium"><Input inputMode="decimal" value={r.share_premium} onChange={set("share_premium")} /></Field>
                </>}
                {(r.kind === "loan_in" || r.kind === "loan_out") && <Field label="To be repaid by"><Input type="date" value={r.repay_by} onChange={set("repay_by")} /></Field>}
              </div>
              <Field label="Notes"><Textarea rows={2} value={r.notes} onChange={set("notes")} /></Field>
              <div className="flex flex-wrap justify-end gap-2">
                {rows.length > 1 && <Button type="button" variant="ghost" className="text-red-600" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>Remove</Button>}
                <Button type="button" variant="secondary" disabled={!ready(r)} onClick={() => patch(r.key, { open: false })}>Done</Button>
              </div>
            </div>
          );
        })}
        <Button type="button" variant="secondary" onClick={add}>Add another</Button>
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-stone-200 pt-3 text-sm text-stone-700">
          <span>{rows.length} record(s)</span><span>Money in {money2(total(true))}</span><span>Money out {money2(total(false))}</span>
        </div>
        {over && (
          <label className="flex items-center gap-2 text-sm text-amber-800">
            <input type="checkbox" checked={allowOver} onChange={(e) => setAllowOver(e.target.checked)} /> I&apos;ve checked: record them anyway
          </label>
        )}
        <FormError error={save.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending} disabled={!rows.length || !rows.every(ready)}>Save all {rows.length}</Button>
        </div>
      </form>
    </Modal>
  );
}
