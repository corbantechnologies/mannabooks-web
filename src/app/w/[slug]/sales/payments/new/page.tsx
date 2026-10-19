"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, EmptyState, Field, FormError, Input, PageHeader, Select, Table, Td, Textarea } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { METHODS, depositFor, useCustomers, useDepositAccounts } from "@/lib/api/sales";
import { fmt, fmtDate, todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

function NewPayment() {
  const { slug, context } = useWorkspace();
  const router = useRouter();
  const params = useSearchParams();
  const customers = useCustomers(slug);
  const deposits = useDepositAccounts(slug);
  const [form, setForm] = useState({
    customer_id: params.get("customer") ?? "", payment_date: todayIso(), amount: "", method: "mpesa", reference: "", deposit_account_id: "", notes: "",
  });
  const [applied, setApplied] = useState<Record<string, string>>({});
  const open = useQuery({
    queryKey: ["invoices", slug, "open", form.customer_id],
    enabled: Boolean(form.customer_id),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/invoices/", {
      params: { path: { workspace: slug }, query: { customer: form.customer_id, status__in: ["issued", "partially_paid"], ordering: "due_date", page_size: 200 } },
      querySerializer: { array: { style: "form", explode: false } },  // django-filter wants status__in=a,b
    })),
  });
  const invoices = open.data?.results ?? [];
  const appliedTotal = Object.values(applied).reduce((s, v) => s + (Number(v) || 0), 0);
  const amount = Number(form.amount) || 0;

  function autoApply(total: number) {
    let left = total;
    const next: Record<string, string> = {};
    for (const inv of invoices) {
      const take = Math.min(left, Number(inv.balance_due));
      if (take > 0) next[inv.id] = take.toFixed(2);
      left = Math.round((left - take) * 100) / 100;
    }
    setApplied(next);
  }

  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/payments/", {
      ...wsPath(slug),
      body: {
        ...form, method: form.method as "mpesa", deposit_account_id: form.deposit_account_id || depositFor(deposits.data, form.method),
        allocations: Object.entries(applied).filter(([, v]) => Number(v) > 0).map(([invoice_id, v]) => ({ invoice_id, amount: v })),
      },
    })),
    onSuccess: (p) => { toast.success(`Payment ${p.number} recorded`); router.push(`/w/${slug}/sales/payments/${p.id}`); },
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="max-w-5xl">
      <Link href={`/w/${slug}/sales/payments`} className="text-sm text-stone-500 hover:underline">&larr; Payments</Link>
      <PageHeader title="Record a payment" description="Choose the customer and enter what they paid, then apply it to their invoices." guide="payments" />
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Card className="grid gap-3 p-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Field label="Customer" error={fieldError(save.error, "customer_id")}>
              <Select required value={form.customer_id} onChange={(e) => { setApplied({}); set("customer_id")(e); }}>
                <option value="">Choose a customer</option>
                {(customers.data?.results ?? []).map((c) => <option key={c.id} value={c.id}>{c.name} (owes {fmt(c.balance)})</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Date" error={fieldError(save.error, "payment_date")}><Input type="date" required value={form.payment_date} onChange={set("payment_date")} /></Field>
          <Field label={`Amount (${context.workspace.currency})`} error={fieldError(save.error, "amount")}>
            <Input required inputMode="decimal" value={form.amount} onChange={set("amount")} onBlur={() => appliedTotal === 0 && amount > 0 && autoApply(amount)} />
          </Field>
          <Field label="Method"><Select value={form.method} onChange={(e) => setForm((prev) => ({ ...prev, method: e.target.value, deposit_account_id: "" }))}>{METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
          <Field label={form.method === "mpesa" ? "M-Pesa code" : "Reference"} error={fieldError(save.error, "reference")}><Input required={form.method === "mpesa"} value={form.reference} onChange={set("reference")} /></Field>
          <Field label="Received into" error={fieldError(save.error, "deposit_account_id")}>
            <Select value={form.deposit_account_id || depositFor(deposits.data, form.method)} onChange={set("deposit_account_id")}>
              {deposits.data.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-2"><Field label="Notes"><Textarea rows={1} value={form.notes} onChange={set("notes")} /></Field></div>
        </Card>
        {form.customer_id && (
          <Card>
            <div className="flex items-center justify-between px-4 pt-3 text-sm">
              <span className="font-semibold">Apply to invoices</span>
              <Button type="button" variant="ghost" className="px-2 py-1" onClick={() => autoApply(amount)} disabled={!amount}>Apply oldest first</Button>
            </div>
            {invoices.length === 0 ? <EmptyState title="This customer has no unpaid invoices">The whole amount will be kept as their credit.</EmptyState> : (
              <Table head={["Invoice", "Due", "Balance", "Apply"]}>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <Td className="font-mono text-xs">{inv.number}</Td>
                    <Td className={inv.is_overdue ? "text-red-600" : ""}>{fmtDate(inv.due_date)}</Td>
                    <Td className="text-right font-mono">{fmt(inv.balance_due)}</Td>
                    <Td className="w-40"><Input inputMode="decimal" className="text-right" value={applied[inv.id] ?? ""} onChange={(e) => setApplied((prev) => ({ ...prev, [inv.id]: e.target.value }))} /></Td>
                  </tr>
                ))}
              </Table>
            )}
            <p className={`px-4 pb-3 text-right text-sm ${appliedTotal > amount ? "text-red-600" : "text-stone-600"}`}>
              Applied {fmt(appliedTotal)} of {fmt(amount)}{amount > appliedTotal ? ` · ${fmt(amount - appliedTotal)} kept as credit` : ""}
            </p>
          </Card>
        )}
        <FormError error={save.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" loading={save.isPending} disabled={appliedTotal > amount}>Record payment</Button>
        </div>
      </form>
    </div>
  );
}

export default function NewPaymentPage() {
  return <Suspense><NewPayment /></Suspense>;
}
