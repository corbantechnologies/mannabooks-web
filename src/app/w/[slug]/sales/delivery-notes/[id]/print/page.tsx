"use client";

import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { useParams } from "next/navigation";

import { Button, ErrorState, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function PrintDeliveryNotePage() {
  const { slug, context } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const note = useQuery({ queryKey: ["delivery-note", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/delivery-notes/{id}/", { params: { path: { workspace: slug, id } } })) });
  if (note.isLoading) return <Spinner />;
  if (note.error) return <ErrorState error={note.error} />;
  const d = note.data!;
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
            <p className="text-xl font-bold uppercase tracking-wide">Delivery note</p>
            <p className="font-mono">{d.number}</p>
            <p>{fmtDate(d.delivery_date)}</p>
          </div>
        </header>
        <section className="mt-4 grid grid-cols-2 gap-6">
          <div><p className="text-xs uppercase text-stone-400">Deliver to</p><p className="font-medium">{d.customer_name}</p><p className="whitespace-pre-line">{d.delivery_address}</p>{d.contact_person && <p>{d.contact_person} {d.contact_phone}</p>}</div>
          <div className="text-right">{d.invoice_number && <p>Invoice {d.invoice_number}</p>}{d.vehicle && <p>Vehicle {d.vehicle}</p>}{d.driver && <p>Driver {d.driver}</p>}</div>
        </section>
        <table className="mt-6 w-full border-collapse">
          <thead><tr className="border-b border-stone-300 text-left text-xs uppercase text-stone-500"><th className="py-2">Description</th><th className="py-2 text-right">Qty</th><th className="py-2 pl-4">Unit</th><th className="py-2 pl-4">Checked</th></tr></thead>
          <tbody>{(d.lines ?? []).map((l) => <tr key={l.id} className="border-b border-stone-100"><td className="py-2">{l.description}</td><td className="py-2 text-right">{Number(l.quantity)}</td><td className="py-2 pl-4">{l.unit}</td><td className="py-2 pl-4">☐</td></tr>)}</tbody>
        </table>
        {d.notes && <p className="mt-4 whitespace-pre-line">{d.notes}</p>}
        <section className="mt-16 grid grid-cols-2 gap-10 text-xs">
          <div><p className="border-t border-stone-400 pt-1">Delivered by (name and signature)</p></div>
          <div><p className="border-t border-stone-400 pt-1">Received in good order by (name, signature, date and stamp)</p></div>
        </section>
      </article>
    </div>
  );
}
