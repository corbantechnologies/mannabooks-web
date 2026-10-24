"use client";

import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { useParams } from "next/navigation";

import { Button, ErrorState, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function PrintVoucherPage() {
  const { slug, context } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const voucher = useQuery({ queryKey: ["payment-voucher", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/payment-vouchers/{id}/", { params: { path: { workspace: slug, id } } })) });
  if (voucher.isLoading) return <Spinner />;
  if (voucher.error) return <ErrorState error={voucher.error} />;
  const v = voucher.data!;
  const ws = context.workspace;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-100 py-6 print:static print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] justify-end gap-2 px-4 print:hidden">
        <Button variant="secondary" onClick={() => history.back()}>Back</Button>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Print or save PDF</Button>
      </div>
      <article className="mx-auto max-w-[210mm] bg-white p-10 text-sm text-stone-800 shadow print:shadow-none">
        <header className="flex justify-between border-b border-stone-200 pb-4">
          <div><p className="text-lg font-bold">{ws.legal_name || ws.name}</p>{ws.kra_pin && <p className="text-stone-500">KRA PIN: {ws.kra_pin}</p>}</div>
          <div className="text-right"><p className="text-xl font-bold uppercase tracking-wide">Payment voucher</p><p className="font-mono">{v.number}</p><p>{fmtDate(v.voucher_date)}</p></div>
        </header>
        <p className="mt-4"><span className="text-stone-500">Pay:</span> <span className="font-medium">{v.supplier_name}</span></p>
        {v.supplier_bank_details && <p className="whitespace-pre-line text-stone-600">{v.supplier_bank_details}</p>}
        {v.notes && <p className="mt-2">{v.notes}</p>}
        <table className="mt-6 w-full border-collapse text-left tabular-nums">
          <colgroup><col className="w-8" /><col /><col className="w-36" /><col className="w-36" /></colgroup>
          <thead><tr className="border-y border-stone-300 text-xs uppercase tracking-wide text-stone-500"><th className="py-2 pr-2 font-medium">#</th><th className="py-2 pr-4 font-medium">Their invoice</th><th className="whitespace-nowrap py-2 pl-4 font-medium">Date</th><th className="whitespace-nowrap py-2 pl-4 text-right font-medium">Amount</th></tr></thead>
          <tbody>{v.lines.map((l, i) => (
            <tr key={l.bill_id} className="break-inside-avoid border-b border-stone-200 align-top">
              <td className="py-2.5 pr-2 text-stone-500">{i + 1}</td><td className="py-2.5 pr-4">{l.bill_number}</td>
              <td className="whitespace-nowrap py-2.5 pl-4">{fmtDate(l.bill_date)}</td><td className="whitespace-nowrap py-2.5 pl-4 text-right font-medium">{fmt(l.amount)}</td>
            </tr>
          ))}</tbody>
        </table>
        <dl className="ml-auto mt-4 grid w-72 grid-cols-[1fr_auto] gap-x-6 gap-y-1 tabular-nums">
          <dt className="text-stone-500">Bills</dt><dd className="text-right">{fmt(v.total)}</dd>
          <dt className="text-stone-500">Less withholding tax</dt><dd className="text-right">{fmt(v.withholding_amount)}</dd>
          <dt className="border-t border-stone-300 pt-1 font-bold">To pay</dt><dd className="border-t border-stone-300 pt-1 text-right font-bold">{fmt(v.net_payable)}</dd>
        </dl>
        <section className="mt-16 grid grid-cols-3 gap-8 text-xs">
          <p className="border-t border-stone-400 pt-1">Prepared by {v.prepared_by_name ?? ""}</p>
          <p className="border-t border-stone-400 pt-1">Approved by {v.approved_by_name ?? ""}</p>
          <p className="border-t border-stone-400 pt-1">Received by (name, signature, date)</p>
        </section>
      </article>
    </div>
  );
}
