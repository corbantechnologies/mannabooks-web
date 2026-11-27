"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { AsPage, Button, Card, FormError, Input, Modal, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { useFormFlag } from "@/lib/page-form";

/**
 * Money paid to a supplier before their bill existed (a deposit) is "not applied" on the payment.
 * These apply it to the bill once it is posted: from the payment (to any of the supplier's open bills) or from the bill.
 */
function useApply(slug: string, paymentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: { bill_id: string; amount: string }[]) =>
      unwrap(await api.POST("/api/v1/w/{workspace}/supplier-payments/{id}/allocate/", { params: { path: { workspace: slug, id: paymentId } }, body: { allocations: rows } })),
    onSuccess: () => {
      toast.success("Applied to the bill");
      for (const key of ["supplier-payment", "supplier-payments", "bill", "bills", "supplier-advances"]) void qc.invalidateQueries({ queryKey: [key] });
    },
  });
}

/** On a supplier payment with money not yet applied: choose which of the supplier's bills it pays. */
export function ApplyToBills({ paymentId, supplierId, unapplied }: { paymentId: string; supplierId: string; unapplied: string }) {
  const { slug } = useWorkspace();
  const [open, setOpen] = useFormFlag("apply");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const bills = useQuery({
    queryKey: ["bills", slug, "open-for", supplierId], enabled: open,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/bills/", {
      params: { path: { workspace: slug }, query: { supplier: supplierId, status__in: "posted,partially_paid", ordering: "bill_date", page_size: 100 } as never },
    })),
  });
  const apply = useApply(slug, paymentId);
  const rows = bills.data?.results ?? [];
  const start = () => {
    // fill the oldest bills first, up to what is left on the payment
    let left = Number(unapplied);
    const fill: Record<string, string> = {};
    for (const b of rows) {
      const take = Math.min(left, Number(b.balance_due));
      if (take > 0) { fill[b.id] = take.toFixed(2); left -= take; }
    }
    setAmounts(fill);
  };
  const total = Object.values(amounts).reduce((s, v) => s + (Number(v) || 0), 0);
  if (open) {
    return (
      <AsPage guide="supplier-payments">
      <Modal open size="lg" title="Apply this payment to bills" onClose={() => setOpen(false)}>
        {bills.isLoading ? <Spinner /> : (
          <div className="space-y-4 text-sm">
            <p className="text-stone-600">{fmt(unapplied)} of this payment isn&apos;t applied yet. Choose how much goes to each posted bill. A bill still in draft must be posted first.</p>
            {rows.length === 0 ? <p className="text-stone-500">This supplier has no posted bills waiting to be paid.</p> : (
              <>
                <Table head={["Their invoice", "Date", "Balance", "Apply"]}>
                  {rows.map((b) => (
                    <tr key={b.id}>
                      <Td className="font-mono text-xs">{b.supplier_invoice_number}</Td>
                      <Td>{fmtDate(b.bill_date)}</Td>
                      <Td className="text-right font-mono">{fmt(b.balance_due)}</Td>
                      <Td className="w-36"><Input inputMode="decimal" value={amounts[b.id] ?? ""} onChange={(e) => setAmounts((a) => ({ ...a, [b.id]: e.target.value }))} /></Td>
                    </tr>
                  ))}
                </Table>
                <div className="flex items-center justify-between">
                  <Button variant="ghost" onClick={start}>Fill oldest first</Button>
                  <span className={total > Number(unapplied) ? "text-red-600" : "text-stone-600"}>Applying {fmt(total)} of {fmt(unapplied)}</span>
                </div>
              </>
            )}
            <FormError error={apply.error} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button loading={apply.isPending} disabled={total <= 0 || total > Number(unapplied)}
                onClick={() => apply.mutate(Object.entries(amounts).filter(([, v]) => Number(v) > 0).map(([bill_id, amount]) => ({ bill_id, amount })), { onSuccess: () => setOpen(false) })}>
                Apply {fmt(total)}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      </AsPage>
    );
  }
  return (
    <>
      <Button onClick={() => { apply.reset(); setAmounts({}); setOpen(true); }}>Apply to bills</Button>
    </>
  );
}

/** On an open bill: deposits already paid to this supplier, each ready to apply here in one click. */
export function SupplierAdvances({ billId, supplierId, balance }: { billId: string; supplierId: string; balance: string }) {
  const { slug, can } = useWorkspace();
  const q = useQuery({
    queryKey: ["supplier-advances", slug, supplierId], enabled: can("supplierpayments.view"),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/supplier-payments/", {
      params: { path: { workspace: slug }, query: { supplier: supplierId, status: "posted", unallocated_amount__gt: "0", page_size: 50 } as never },
    })),
  });
  const rows = q.data?.results ?? [];
  if (rows.length === 0 || Number(balance) <= 0) return null;
  const total = rows.reduce((s, p) => s + Number(p.unallocated_amount), 0);
  return (
    <Card className="mb-4 border-amber-200 bg-amber-50 p-4 text-sm">
      <p className="font-medium text-amber-900">{fmt(total)} already paid to this supplier in advance</p>
      <p className="text-amber-800">Apply it here so only the rest is left to pay.</p>
      <ul className="mt-2 space-y-2">
        {rows.map((p) => <AdvanceRow key={p.id} slug={slug} billId={billId} balance={balance} payment={p} canApply={can("supplierpayments.create")} />)}
      </ul>
    </Card>
  );
}

function AdvanceRow({ slug, billId, balance, payment: p, canApply }: {
  slug: string; billId: string; balance: string; canApply: boolean;
  payment: { id: string; number: string; payment_date: string; unallocated_amount?: string; reference?: string };
}) {
  const apply = useApply(slug, p.id);
  const amount = Math.min(Number(p.unallocated_amount ?? 0), Number(balance)).toFixed(2);
  return (
    <li className="flex flex-wrap items-center justify-between gap-2">
      <span><Link className="font-mono text-xs underline" href={`/w/${slug}/purchasing/payments/${p.id}`}>{p.number}</Link> · {fmtDate(p.payment_date)}{p.reference ? ` · ${p.reference}` : ""} · {fmt(p.unallocated_amount)} not applied</span>
      {canApply && <Button variant="secondary" loading={apply.isPending} onClick={() => apply.mutate([{ bill_id: billId, amount }])}>Apply {fmt(amount)}</Button>}
      {apply.error && <span className="w-full"><FormError error={apply.error} /></span>}
    </li>
  );
}
