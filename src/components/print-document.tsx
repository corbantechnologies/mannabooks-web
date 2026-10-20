"use client";

import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";

import { api, unwrap } from "@/lib/api/client";
import type { SalesLine, Workspace } from "@/lib/api/types";
import { fmt, fmtDate, todayIso, qtyText } from "@/lib/format";

import { Button } from "./ui";

/** A clean A4 layout for invoices, cash sales and credit notes. Print or save as PDF from the browser. */
export function PrintDocument({
  title,
  number,
  workspace,
  party,
  details,
  lines,
  subtotal,
  tax,
  total,
  currency,
  footer,
  etims,
  howToPay = false,
}: {
  title: string;
  number: string;
  workspace: Workspace;
  party: { name: string; pin?: string; lines?: string[] };
  details: [string, string][];
  lines: SalesLine[];
  subtotal: string;
  tax: string;
  total: string;
  currency: string;
  footer?: string;
  etims?: { status: string; cu?: string; signature?: string };
  /** Print the business's payment options (invoices, quotations, debit notes). */
  howToPay?: boolean;
}) {
  const options = useQuery({
    queryKey: ["payment-options", workspace.slug],
    enabled: howToPay,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/payment-options/", { params: { path: { workspace: workspace.slug } } })),
  });
  const payTo = (options.data ?? []).filter((o) => o.show_on_documents);
  return (
    <div className="min-h-screen bg-stone-100 py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] justify-end gap-2 px-4 print:hidden">
        <Button variant="secondary" onClick={() => history.back()}>Back</Button>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Print or save PDF</Button>
      </div>
      <article className="mx-auto min-h-[297mm] max-w-[210mm] bg-white p-[14mm] text-[13px] text-stone-900 shadow print:shadow-none">
        <header className="flex justify-between gap-6 border-b border-stone-300 pb-5">
          <div>
            <h1 className="text-xl font-bold">{workspace.legal_name || workspace.name}</h1>
            {workspace.address && <p className="whitespace-pre-line text-stone-600">{workspace.address}</p>}
            <p className="text-stone-600">{[workspace.phone, workspace.email].filter(Boolean).join(" · ")}</p>
            {workspace.kra_pin && <p className="text-stone-600">KRA PIN: {workspace.kra_pin}{workspace.vat_number ? ` · VAT No: ${workspace.vat_number}` : ""}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold uppercase tracking-wide text-stone-800">{title}</p>
            <p className="font-mono text-base">{number}</p>
          </div>
        </header>
        <section className="mt-5 flex justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">To</p>
            <p className="font-semibold">{party.name || "Walk-in customer"}</p>
            {party.lines?.filter(Boolean).map((l) => <p key={l} className="text-stone-600">{l}</p>)}
            {party.pin && <p className="text-stone-600">KRA PIN: {party.pin}</p>}
          </div>
          <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-right">
            {details.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="contents"><dt className="text-stone-500">{k}</dt><dd className="font-medium">{v}</dd></div>
            ))}
          </dl>
        </section>
        <table className="mt-6 w-full border-collapse text-left">
          <thead>
            <tr className="border-y border-stone-300 text-xs uppercase tracking-wide text-stone-500">
              <th className="py-2 pr-2">Description</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Price</th>
              <th className="py-2 text-right">VAT</th><th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-stone-200">
                <td className="py-2 pr-2">{l.description}{Number(l.discount_percent) ? <span className="text-stone-500"> (less {Number(l.discount_percent)}%)</span> : null}</td>
                <td className="py-2 text-right">{qtyText(l)}</td>
                <td className="py-2 text-right">{fmt(l.unit_price)}</td>
                <td className="py-2 text-right">{fmt(l.tax_amount)}</td>
                <td className="py-2 text-right">{fmt(l.total_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex justify-end">
          <dl className="grid w-64 grid-cols-2 gap-y-1">
            <dt className="text-stone-500">Subtotal</dt><dd className="text-right">{fmt(subtotal)}</dd>
            <dt className="text-stone-500">VAT</dt><dd className="text-right">{fmt(tax)}</dd>
            <dt className="border-t border-stone-300 pt-1 font-bold">Total {currency}</dt><dd className="border-t border-stone-300 pt-1 text-right font-bold">{fmt(total)}</dd>
          </dl>
        </div>
        {etims && etims.status && etims.status !== "disabled" && (
          <section className="mt-8 rounded border border-stone-200 p-3 text-xs text-stone-600">
            {etims.status === "signed" ? (
              <>KRA eTIMS: CU invoice no. <span className="font-mono">{etims.cu}</span>{etims.signature ? ` · Signature ${etims.signature}` : ""}</>
            ) : (
              <>Awaiting KRA eTIMS signature.</>
            )}
          </section>
        )}
        {howToPay && payTo.length > 0 && (
          <section className="mt-8">
            <p className="text-xs uppercase tracking-wide text-stone-500">How to pay</p>
            <div className="mt-1 grid grid-cols-2 gap-4">
              {payTo.map((o) => (
                <div key={o.id}>{o.lines.map((l) => <p key={l}>{l.replace("the document number", number)}</p>)}</div>
              ))}
            </div>
          </section>
        )}
        {footer && <p className="mt-6 whitespace-pre-line text-stone-600">{footer}</p>}
        <p className="mt-10 text-center text-xs text-stone-400">Printed {fmtDate(todayIso())} · MannaBooks</p>
      </article>
    </div>
  );
}
