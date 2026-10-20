"use client";

import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { useParams } from "next/navigation";

import { Button, ErrorState, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate, qtyText } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function PrintOrderPage() {
  const { slug, context } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const order = useQuery({ queryKey: ["purchase-order", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/purchase-orders/{id}/", { params: { path: { workspace: slug, id } } })) });
  if (order.isLoading) return <Spinner />;
  if (order.error) return <ErrorState error={order.error} />;
  const o = order.data!;
  const ws = context.workspace;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-100 py-6 print:static print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] justify-end gap-2 px-4 print:hidden">
        <Button variant="secondary" onClick={() => history.back()}>Back</Button>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Print or save PDF</Button>
      </div>
      <article className="mx-auto max-w-[210mm] bg-white p-10 text-sm text-stone-800 shadow print:shadow-none">
        <header className="flex justify-between gap-6 border-b border-stone-200 pb-4">
          <div>
            <p className="text-lg font-bold">{ws.legal_name || ws.name}</p>
            <p className="text-stone-500">{[ws.phone, ws.email].filter(Boolean).join(" · ")}</p>
            {ws.kra_pin && <p className="text-stone-500">KRA PIN: {ws.kra_pin}</p>}
          </div>
          <div className="text-right">
            <p className="text-xl font-bold uppercase tracking-wide">Local purchase order</p>
            <p className="font-mono">{o.number}</p>
            <p>{fmtDate(o.order_date)}</p>
          </div>
        </header>
        <section className="mt-4 grid grid-cols-2 gap-6">
          <div><p className="text-xs uppercase text-stone-400">Supplier</p><p className="font-medium">{o.supplier_name}</p></div>
          <div className="text-right">{o.expected_date && <p>Deliver by {fmtDate(o.expected_date)}</p>}{o.warehouse_name && <p>Deliver to {o.warehouse_name}</p>}{o.reference && <p>Ref. {o.reference}</p>}</div>
        </section>
        <table className="mt-6 w-full border-collapse">
          <thead><tr className="border-b border-stone-300 text-left text-xs uppercase text-stone-500"><th className="py-2">Description</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Unit cost</th><th className="py-2 text-right">Amount</th></tr></thead>
          <tbody>{(o.lines ?? []).map((l) => <tr key={l.id} className="border-b border-stone-100"><td className="py-2">{l.description}</td><td className="py-2 text-right">{qtyText(l)}</td><td className="py-2 text-right">{fmt(l.unit_cost)}</td><td className="py-2 text-right">{fmt(l.total_amount)}</td></tr>)}</tbody>
        </table>
        <dl className="ml-auto mt-4 grid w-64 grid-cols-2 gap-y-1">
          <dt className="text-stone-500">Subtotal</dt><dd className="text-right">{fmt(o.subtotal)}</dd>
          <dt className="text-stone-500">VAT</dt><dd className="text-right">{fmt(o.tax_total)}</dd>
          <dt className="border-t border-stone-300 pt-1 font-bold">Total</dt><dd className="border-t border-stone-300 pt-1 text-right font-bold">{fmt(o.total)}</dd>
        </dl>
        {o.notes && <p className="mt-6 whitespace-pre-line">{o.notes}</p>}
        <section className="mt-16 grid grid-cols-2 gap-10 text-xs">
          <div><p className="border-t border-stone-400 pt-1">Approved by {o.approved_by_name ?? ""}</p></div>
          <div><p className="border-t border-stone-400 pt-1">Supplier&apos;s acceptance (name, signature and date)</p></div>
        </section>
        <p className="mt-6 text-xs text-stone-500">Please quote {o.number} on your delivery note and invoice.</p>
      </article>
    </div>
  );
}
