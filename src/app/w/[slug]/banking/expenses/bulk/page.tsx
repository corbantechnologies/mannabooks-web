"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, Field, FormError, Input, PageHeader, Select } from "@/components/ui";
import { AccountOptions, useAccounts } from "@/lib/api/accounting";
import { useBankAccounts } from "@/lib/api/banking";
import { api, unwrap } from "@/lib/api/client";
import { useVatRates } from "@/lib/api/sales";
import { fmt, fmtDate, startDate } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

type Row = {
  key: number; open: boolean; expense_date: string; paid_from_id: string; payee: string; account_id: string; amount: string;
  tax_rate_id: string; reference: string; description: string;
};

const METHOD: Record<string, string> = { mobile: "mpesa", cash: "cash", card: "card" };

/** Several expenses at once (a week of fuel, electricity, shopping, utilities), each folding away when done. All are saved or none. */
export default function BulkExpensesPage() {
  const { slug } = useWorkspace();
  const router = useRouter();
  const banks = useBankAccounts(slug);
  const chart = useAccounts(slug);
  const rates = useVatRates(slug);
  const active = (banks.data?.results ?? []).filter((a) => a.is_active);
  const expenseAccounts = (chart.data ?? []).filter((a) => a.is_active && a.account_type === "expense");
  const [next, setNext] = useState(1);
  const blank = (key: number, from?: Row): Row => ({
    key, open: true, expense_date: from?.expense_date ?? startDate(), paid_from_id: from?.paid_from_id ?? "", payee: "", account_id: "",
    amount: "", tax_rate_id: from?.tax_rate_id ?? "", reference: "", description: "",
  });
  const [rows, setRows] = useState<Row[]>(() => [blank(0)]);
  const patch = (key: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const remove = (key: number) => setRows((rs) => rs.filter((r) => r.key !== key));
  const fromId = (r: Row) => r.paid_from_id || active[0]?.id || "";
  const ready = (r: Row) => Boolean(Number(r.amount) > 0 && r.expense_date && fromId(r) && r.account_id);
  const add = () => {
    const last = rows[rows.length - 1];
    setRows((rs) => [...rs.map((r) => (ready(r) ? { ...r, open: false } : r)), blank(next, last)]);
    setNext((n) => n + 1);
  };
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/expenses/bulk/", {
      ...wsPath(slug),
      body: {
        rows: rows.map((r) => {
          const from = active.find((a) => a.id === fromId(r));
          return {
            expense_date: r.expense_date, paid_from_id: fromId(r), payee: r.payee, reference: r.reference, method: METHOD[from?.kind ?? ""] ?? "bank",
            prices_include_tax: true,
            lines: [{ description: r.description || r.payee, quantity: "1", unit_cost: r.amount, account_id: r.account_id, tax_rate_id: r.tax_rate_id || null }],
          };
        }),
      } as never,
    })),
    onSuccess: (made) => { toast.success(`${made.length} expense(s) saved`); router.push(`/w/${slug}/banking/expenses`); },
  });
  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const nameOf = (id: string, list: { id: string; name: string }[]) => list.find((x) => x.id === id)?.name ?? "";
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/banking/expenses`} className="text-sm text-stone-500 hover:underline">&larr; Expenses</Link>
      <PageHeader title="Record expenses in bulk" guide="expenses"
        description="Fuel, electricity, shopping, utilities: one record each. Press Done to fold one away. Nothing is saved until you save them all, and if one has a problem none are saved." />
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        {rows.map((r, i) => {
          const set = (key: keyof Row) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => patch(r.key, { [key]: e.target.value });
          if (!r.open) {
            return (
              <Card key={r.key} className="flex flex-wrap items-center justify-between gap-2 bg-stone-50 px-3 py-2 text-sm">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => patch(r.key, { open: true })}>
                  <span className="font-medium">{i + 1}. {r.payee || nameOf(r.account_id, expenseAccounts)}</span>
                  <span className="ml-2 text-stone-600">{fmtDate(r.expense_date)} · {nameOf(r.account_id, expenseAccounts)} · {nameOf(fromId(r), active)}{r.reference ? ` · ${r.reference}` : ""}</span>
                </button>
                <span className="font-mono">{fmt(r.amount)}</span>
                <span className="flex gap-3">
                  <button type="button" className="text-xs text-brand-700 hover:underline" onClick={() => patch(r.key, { open: true })}>Change</button>
                  <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => remove(r.key)}>Remove</button>
                </span>
              </Card>
            );
          }
          return (
            <Card key={r.key} className="space-y-3 p-4">
              <p className="text-sm font-semibold">Expense {i + 1}</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Date"><Input type="date" required value={r.expense_date} onChange={set("expense_date")} /></Field>
                <Field label="Paid from"><Select value={fromId(r)} onChange={set("paid_from_id")}>{active.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
                <Field label="Paid to"><Input value={r.payee} onChange={set("payee")} placeholder="e.g. KPLC, Rubis, Naivas" /></Field>
                <Field label="What it was for">
                  <Select required value={r.account_id} onChange={set("account_id")}><option value="">Choose</option><AccountOptions accounts={expenseAccounts} /></Select>
                </Field>
                <Field label="Amount" hint="As paid, VAT included"><Input required inputMode="decimal" value={r.amount} onChange={set("amount")} /></Field>
                <Field label="VAT">
                  <Select value={r.tax_rate_id} onChange={set("tax_rate_id")}><option value="">No VAT</option>{(rates.data?.results ?? []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>
                </Field>
                <Field label="Reference"><Input value={r.reference} onChange={set("reference")} placeholder="M-Pesa code, receipt no." /></Field>
                <Field label="Description"><Input value={r.description} onChange={set("description")} placeholder="e.g. Tokens for the shop" /></Field>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {rows.length > 1 && <Button type="button" variant="ghost" className="text-red-600" onClick={() => remove(r.key)}>Remove</Button>}
                <Button type="button" variant="secondary" disabled={!ready(r)} onClick={() => patch(r.key, { open: false })}>Done</Button>
              </div>
            </Card>
          );
        })}
        <Button type="button" variant="secondary" onClick={add}>Add another</Button>
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-stone-200 pt-3 text-sm text-stone-700">
          <span>{rows.length} expense(s)</span><span>Total {fmt(total)}</span>
        </div>
        <p className="text-xs text-stone-500">Need a supplier, several lines or the eTIMS number? Use <Link className="text-brand-700 hover:underline" href={`/w/${slug}/banking/expenses/new`}>Spend money</Link> for that one.</p>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" loading={save.isPending} disabled={!rows.length || !rows.every(ready)}>Save all {rows.length}</Button>
        </div>
      </form>
    </div>
  );
}
