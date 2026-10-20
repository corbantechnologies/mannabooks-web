"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, Field, FormError, Input, Modal, PageHeader, Select, Spinner } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { ACCOUNT_KINDS, useBankAccounts } from "@/lib/api/banking";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function BankingPage() {
  const { slug, can, context } = useWorkspace();
  const accounts = useBankAccounts(slug);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", kind: "bank" as "bank" | "mobile" | "cash", bank_name: "", branch: "", account_number: "" });
  const create = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/bank-accounts/", { ...wsPath(slug), body: form })),
    onSuccess: (a) => { toast.success(`${a.name} added (ledger ${a.ledger_code})`); setCreating(false); },
  });
  const rows = (accounts.data?.results ?? []).filter((a) => a.is_active);
  const total = rows.reduce((s, a) => s + Number(a.balance), 0);
  return (
    <div className="w-full">
      <PageHeader title="Cash and banking" description={`Your bank, M-Pesa and cash accounts. Total ${context.workspace.currency} ${fmt(total)}.`} guide="banking"
        actions={
          <div className="flex flex-wrap gap-2">
            {can("banking.spend") && <Link href={`/w/${slug}/banking/expenses/new`}><Button variant="secondary">Spend money</Button></Link>}
            {can("banking.receive") && <Link href={`/w/${slug}/banking/income/new`}><Button variant="secondary">Receive money</Button></Link>}
            {can("banking.transfer") && <Link href={`/w/${slug}/banking/transfers`}><Button variant="secondary">Transfer</Button></Link>}
            {can("banking.reconcile") && <Button onClick={() => { create.reset(); setCreating(true); }}><Plus className="h-4 w-4" /> Add account</Button>}
          </div>
        } />
      {accounts.isLoading ? <Spinner /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((a) => (
            <Link key={a.id} href={`/w/${slug}/banking/accounts/${a.id}`}>
              <Card className="h-full p-4 hover:border-brand-600">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-stone-500">{ACCOUNT_KINDS.find((k) => k.value === a.kind)?.label}{a.account_number ? ` · ${a.account_number}` : ""}</p>
                  </div>
                  {Number(a.unmatched_lines) > 0 && <Badge tone="amber">{a.unmatched_lines} to match</Badge>}
                </div>
                <p className={`mt-4 font-mono text-2xl ${Number(a.balance) < 0 ? "text-red-600" : ""}`}>{fmt(a.balance)}</p>
                <p className="mt-1 text-xs text-stone-500">{a.last_reconciled ? `Reconciled to ${fmtDate(a.last_reconciled)}` : "Never reconciled"}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <Modal open={creating} title="Add an account" onClose={() => setCreating(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" error={fieldError(create.error, "name")}><Input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Equity Bank current" /></Field>
            <Field label="Type"><Select value={form.kind} onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value as typeof form.kind }))}>{ACCOUNT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</Select></Field>
            {form.kind !== "cash" && <Field label={form.kind === "mobile" ? "Provider" : "Bank"}><Input value={form.bank_name} onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))} /></Field>}
            {form.kind === "bank" && <Field label="Branch"><Input value={form.branch} onChange={(e) => setForm((p) => ({ ...p, branch: e.target.value }))} /></Field>}
            {form.kind !== "cash" && <Field label={form.kind === "mobile" ? "Till or paybill number" : "Account number"}><Input value={form.account_number} onChange={(e) => setForm((p) => ({ ...p, account_number: e.target.value }))} /></Field>}
          </div>
          <p className="text-xs text-stone-500">An account is added to your chart of accounts for it.</p>
          <FormError error={create.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit" loading={create.isPending}>Add</Button></div>
        </form>
      </Modal>
    </div>
  );
}
