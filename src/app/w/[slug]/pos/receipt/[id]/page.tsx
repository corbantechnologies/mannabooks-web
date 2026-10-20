"use client";

import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { useParams } from "next/navigation";

import { Button, ErrorState, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { METHODS, etimsVisible } from "@/lib/api/sales";
import { fmt, qtyText } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

/** A till slip for 80 mm receipt printers. */
export default function SlipPage() {
  const { slug, context } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const receipt = useQuery({ queryKey: ["receipt", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/receipts/{id}/", { params: { path: { workspace: slug, id } } })) });
  if (receipt.isLoading) return <Spinner />;
  if (receipt.error) return <ErrorState error={receipt.error} />;
  const r = receipt.data!;
  const ws = context.workspace;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-100 py-6 print:static print:bg-white print:py-0">
      <style>{"@media print { @page { size: 80mm auto; margin: 0 } }"}</style>
      <div className="mx-auto mb-4 flex w-[80mm] justify-end gap-2 print:hidden">
        <Button variant="secondary" onClick={() => history.back()}>Back</Button>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
      </div>
      <article className="mx-auto w-[80mm] bg-white p-3 font-mono text-[11px] leading-snug text-black shadow print:shadow-none">
        <div className="text-center">
          <p className="text-sm font-bold">{ws.legal_name || ws.name}</p>
          {ws.phone && <p>{ws.phone}</p>}
          {ws.kra_pin && <p>PIN: {ws.kra_pin}</p>}
          <p className="mt-1">{r.number} · {new Date(r.created_at!).toLocaleString("en-KE")}</p>
          {r.customer_name && <p>Customer: {r.customer_name}{r.customer_pin ? ` (${r.customer_pin})` : ""}</p>}
        </div>
        <hr className="my-2 border-dashed border-black" />
        {(r.lines ?? []).map((l) => (
          <div key={l.id} className="mb-1">
            <p>{l.description}</p>
            <p className="flex justify-between"><span>{qtyText(l)} x {fmt(l.unit_price)}{Number(l.discount_amount) ? ` -${fmt(l.discount_amount)}` : ""}</span><span>{fmt(l.total_amount)}</span></p>
          </div>
        ))}
        <hr className="my-2 border-dashed border-black" />
        <p className="flex justify-between"><span>Net</span><span>{fmt(r.subtotal)}</span></p>
        <p className="flex justify-between"><span>VAT</span><span>{fmt(r.tax_total)}</span></p>
        <p className="flex justify-between text-sm font-bold"><span>TOTAL {r.currency}</span><span>{fmt(r.total)}</span></p>
        <p className="mt-1">Paid by {METHODS.find((m) => m.value === r.method)?.label}{r.payment_reference ? ` ${r.payment_reference}` : ""}</p>
        {etimsVisible(r.etims_status) && r.etims_cu_invoice_number && <p className="mt-1">KRA CU: {r.etims_cu_invoice_number}</p>}
        <p className="mt-3 text-center">Thank you for your business.</p>
      </article>
    </div>
  );
}
