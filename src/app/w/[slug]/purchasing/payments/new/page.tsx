"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, Field, FormError, Input, PageHeader, Select, Table, Td } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { PAY_METHODS, usePayingAccounts, useSuppliers } from "@/lib/api/purchasing";
import { depositFor } from "@/lib/api/sales";
import { fmt, todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function NewSupplierPaymentPage() {
  const { slug } = useWorkspace();
  const router = useRouter();
  const suppliers = useSuppliers(slug);
  const accounts = usePayingAccounts(slug);
  const [form, setForm] = useState({ supplier_id: "", payment_date: todayIso(), amount: "", withholding_amount: "0", method: "bank", reference: "", paid_from_id: "", notes: "" });
  const [applied, setApplied] = useState<Record<string, string>>({});
  const bills = useQuery({
    queryKey: ["bills", slug, "open", form.supplier_id], enabled: Boolean(form.supplier_id),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/bills/", {
      params: { path: { workspace: slug }, query: { supplier: form.supplier_id, status__in: ["posted", "partially_paid"], page_size: 200 } as never },
      querySerializer: { array: { style: "form", explode: false } },
    })),
  });
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/supplier-payments/", {
      ...wsPath(slug), body: { ...form, paid_from_id: form.paid_from_id || depositFor(accounts.data, form.method),
        allocations: Object.entries(applied).filter(([, v]) => Number(v) > 0).map(([bill_id, amount]) => ({ bill_id, amount })) } as never,
    })),
    onSuccess: (p) => { toast.success(`${p.number} recorded`); router.push(`/w/${slug}/purchasing/payments/${p.id}`); },
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p) => ({ ...p, [key]: e.target.value }));
  return (
    <div className="max-w-5xl">
      <Link href={`/w/${slug}/purchasing/payments`} className="text-sm text-stone-500 hover:underline">&larr; Supplier payments</Link>
      <PageHeader title="Record a supplier payment" description="For a payment made without a voucher. Withholding tax kept back still settles the bill." guide="supplier-payments" />
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Card className="grid gap-3 p-4 sm:grid-cols-3">
          <div className="sm:col-span-2"><Field label="Supplier"><Select required value={form.supplier_id} onChange={(e) => { setApplied({}); set("supplier_id")(e); }}><option value="">Choose a supplier</option>{(suppliers.data?.results ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field></div>
          <Field label="Date"><Input type="date" required value={form.payment_date} onChange={set("payment_date")} /></Field>
          <Field label="Amount paid" error={fieldError(save.error, "amount")}><Input required inputMode="decimal" value={form.amount} onChange={set("amount")} /></Field>
          <Field label="Withholding tax kept back"><Input inputMode="decimal" value={form.withholding_amount} onChange={set("withholding_amount")} /></Field>
          <Field label="Method"><Select value={form.method} onChange={(e) => setForm((p) => ({ ...p, method: e.target.value, paid_from_id: "" }))}>{PAY_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
          <Field label="Paid from"><Select value={form.paid_from_id || depositFor(accounts.data, form.method)} onChange={set("paid_from_id")}>{accounts.data.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}</Select></Field>
          <Field label="Reference"><Input value={form.reference} onChange={set("reference")} /></Field>
        </Card>
        {form.supplier_id && (bills.data?.results ?? []).length > 0 && (
          <Card>
            <Table head={["Their invoice", "Balance", "Apply"]}>
              {bills.data!.results.map((b) => (
                <tr key={b.id}><Td className="font-mono text-xs">{b.supplier_invoice_number}</Td><Td className="text-right font-mono">{fmt(b.balance_due)}</Td>
                  <Td className="w-36"><Input inputMode="decimal" className="text-right" value={applied[b.id] ?? ""} onChange={(e) => setApplied((p) => ({ ...p, [b.id]: e.target.value }))} /></Td></tr>
              ))}
            </Table>
          </Card>
        )}
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button><Button type="submit" loading={save.isPending}>Record payment</Button></div>
      </form>
    </div>
  );
}
