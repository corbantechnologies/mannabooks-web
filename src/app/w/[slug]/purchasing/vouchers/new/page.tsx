"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, EmptyState, Field, FormError, Input, PageHeader, Select, Table, Td, Textarea } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { useSuppliers } from "@/lib/api/purchasing";
import { fmt, fmtDate, todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

function NewVoucher() {
  const { slug } = useWorkspace();
  const router = useRouter();
  const q = useSearchParams();
  const suppliers = useSuppliers(slug);
  const [supplierId, setSupplierId] = useState(q.get("supplier") ?? "");
  const [pay, setPay] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ voucher_date: todayIso(), withholding_amount: "", notes: "" });
  const bills = useQuery({
    queryKey: ["bills", slug, "open", supplierId], enabled: Boolean(supplierId),
    queryFn: async () => {
      const res = unwrap(await api.GET("/api/v1/w/{workspace}/bills/", {
        params: { path: { workspace: slug }, query: { supplier: supplierId, status__in: ["posted", "partially_paid"], ordering: "due_date", page_size: 200 } as never },
        querySerializer: { array: { style: "form", explode: false } },
      }));
      const only = q.get("bill");
      setPay(Object.fromEntries(res.results.filter((b) => !only || b.id === only).map((b) => [b.id, String(Number(b.balance_due))])));
      return res;
    },
  });
  const supplier = (suppliers.data?.results ?? []).find((s) => s.id === supplierId);
  const total = Object.values(pay).reduce((s, v) => s + (Number(v) || 0), 0);
  const create = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/payment-vouchers/", {
      ...wsPath(slug),
      body: {
        supplier_id: supplierId, voucher_date: form.voucher_date, notes: form.notes, withholding_amount: form.withholding_amount === "" ? null : form.withholding_amount,
        lines: Object.entries(pay).filter(([, v]) => Number(v) > 0).map(([bill_id, amount]) => ({ bill_id, amount })),
      } as never,
    })),
    onSuccess: (v) => { toast.success(`${v.number} sent for approval`); router.push(`/w/${slug}/purchasing/vouchers/${v.id}`); },
  });
  return (
    <div className="max-w-5xl">
      <Link href={`/w/${slug}/purchasing/vouchers`} className="text-sm text-stone-500 hover:underline">&larr; Payment vouchers</Link>
      <PageHeader title="New payment voucher" description="Choose the bills to pay. The voucher is approved, then paid." guide="payment-vouchers" />
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
        <Card className="grid gap-3 p-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Field label="Supplier"><Select required value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setPay({}); }}><option value="">Choose a supplier</option>{(suppliers.data?.results ?? []).map((s) => <option key={s.id} value={s.id}>{s.name} (owed {fmt(s.balance)})</option>)}</Select></Field>
          </div>
          <Field label="Date"><Input type="date" required value={form.voucher_date} onChange={(e) => setForm((p) => ({ ...p, voucher_date: e.target.value }))} /></Field>
          <Field label="Withholding tax" hint={supplier?.withholding_tax_rate_name ? `Blank: ${supplier.withholding_tax_rate_name} on the amount before VAT.` : "Blank: none for this supplier."}
            error={fieldError(create.error, "withholding_amount")}>
            <Input inputMode="decimal" value={form.withholding_amount} onChange={(e) => setForm((p) => ({ ...p, withholding_amount: e.target.value }))} />
          </Field>
          <div className="sm:col-span-2"><Field label="Why it is due"><Textarea rows={1} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></Field></div>
        </Card>
        {supplierId && (
          <Card>
            {(bills.data?.results ?? []).length === 0 ? <EmptyState title="No unpaid bills for this supplier" /> : (
              <Table head={["Their invoice", "Date", "Due", "Balance", "Pay now"]}>
                {bills.data!.results.map((b) => (
                  <tr key={b.id}>
                    <Td className="font-mono text-xs">{b.supplier_invoice_number}</Td><Td>{fmtDate(b.bill_date)}</Td>
                    <Td className={b.is_overdue ? "text-red-600" : ""}>{fmtDate(b.due_date)}</Td><Td className="text-right font-mono">{fmt(b.balance_due)}</Td>
                    <Td className="w-36"><Input inputMode="decimal" className="text-right" value={pay[b.id] ?? ""} onChange={(e) => setPay((p) => ({ ...p, [b.id]: e.target.value }))} /></Td>
                  </tr>
                ))}
              </Table>
            )}
            <p className="px-4 py-3 text-right text-sm font-semibold">Total {fmt(total)}</p>
          </Card>
        )}
        <FormError error={create.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button><Button type="submit" loading={create.isPending} disabled={!total}>Send for approval</Button></div>
      </form>
    </div>
  );
}

export default function NewVoucherPage() {
  return <Suspense><NewVoucher /></Suspense>;
}
