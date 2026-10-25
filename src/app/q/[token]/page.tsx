"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, FileDown, Printer, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Badge, Button, Card, ErrorState, FormError, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { ask } from "@/components/confirm";

/** A quotation the business shared: the client reads it, prints it, and accepts or declines it. No sign-in. */
export default function SharedQuotePage() {
  const { token } = useParams<{ token: string }>();
  const qc = useQueryClient();
  const quote = useQuery({
    queryKey: ["shared-quote", token], retry: false,
    refetchInterval: (q) => (q.state.data && !q.state.data.ready ? 30000 : false), // a reviewed quote shows up without a reload
    queryFn: async () => unwrap(await api.GET("/api/v1/shared/quotes/{token}/", { params: { path: { token } } })),
  });
  const answer = useMutation({
    mutationFn: async (action: "accept" | "decline") => unwrap(await api.POST("/api/v1/shared/quotes/{token}/answer/", { params: { path: { token } }, body: { action } })),
    onSuccess: (d) => qc.setQueryData(["shared-quote", token], d),
  });
  if (quote.isLoading) return <div className="p-8"><Spinner label="Opening your quotation" /></div>;
  if (quote.error) return <div className="mx-auto max-w-lg p-8"><ErrorState error={quote.error} /></div>;
  const q = quote.data!;
  const b = q.business;
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8 print:py-0">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {b.logo_url && <img src={b.logo_url} alt="" className="h-12 w-12 rounded-md object-contain" />}
          <div>
            <h1 className="text-xl font-semibold">{b.name}</h1>
            <p className="text-sm text-stone-500">{[b.phone, b.email].filter(Boolean).join(" · ")}</p>
            {b.address && <p className="whitespace-pre-line text-sm text-stone-500">{b.address}</p>}
          </div>
        </div>
        <div className="text-left text-sm sm:text-right">
          <p className="text-lg font-semibold">Quotation {q.number}</p>
          <p className="text-stone-500">For {q.customer.name}</p>
          <p className="text-stone-500">{fmtDate(q.issue_date)}{q.ready ? `, valid until ${fmtDate(q.valid_until)}` : ""}</p>
        </div>
      </header>

      {!q.ready && (
        <Card className="flex items-start gap-3 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Clock className="mt-0.5 h-5 w-5 shrink-0" />
          <div><p className="font-medium">We have your list.</p><p>{b.name} is preparing your quotation. Keep this page: the prices appear here as soon as it is ready, and you get an email if you gave your address.</p></div>
        </Card>
      )}
      {q.status === "accepted" || q.status === "converted" ? (
        <Card className="flex items-center gap-3 border-green-200 bg-green-50 p-4 text-sm text-green-900"><CheckCircle2 className="h-5 w-5" /> You accepted this quotation. {b.name} will be in touch.</Card>
      ) : q.status === "declined" ? (
        <Card className="flex items-center gap-3 p-4 text-sm text-stone-700"><XCircle className="h-5 w-5" /> You declined this quotation.</Card>
      ) : q.is_expired && q.ready ? (
        <Card className="p-4 text-sm"><Badge tone="red">Expired</Badge> <span className="ml-2">Ask {b.name} for a new quotation.</span></Card>
      ) : null}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Item</th><th className="px-3 py-2 text-right font-medium">Qty</th>
              {q.ready && <><th className="px-3 py-2 text-right font-medium">Price</th><th className="px-3 py-2 text-right font-medium">Amount</th></>}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {q.lines.map((l, i) => (
              <tr key={i}>
                <td className="px-3 py-2">{l.description}{l.tax_rate_name && q.ready && <span className="block text-xs text-stone-500">{l.tax_rate_name}</span>}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">{Number(l.quantity)} {l.unit}</td>
                {q.ready && <><td className="px-3 py-2 text-right font-mono">{fmt(l.unit_price ?? "0")}</td><td className="px-3 py-2 text-right font-mono">{fmt(l.total_amount ?? "0")}</td></>}
              </tr>
            ))}
          </tbody>
        </table>
        {q.ready && (
          <dl className="ml-auto grid max-w-xs grid-cols-[1fr_auto] gap-y-1 border-t border-stone-200 p-3 text-sm">
            <dt className="text-stone-500">Before VAT</dt><dd className="text-right font-mono">{fmt(q.subtotal ?? "0")}</dd>
            <dt className="text-stone-500">VAT</dt><dd className="text-right font-mono">{fmt(q.tax_total ?? "0")}</dd>
            <dt className="font-semibold">Total {q.currency}</dt><dd className="text-right font-mono font-semibold">{fmt(q.total ?? "0")}</dd>
          </dl>
        )}
      </Card>

      <FormError error={answer.error} />
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex flex-wrap gap-2">
          {q.pdf_available ? (
            <a href={`/api/backend/api/v1/shared/quotes/${token}/pdf/`} target="_blank" rel="noreferrer">
              <Button variant="secondary"><FileDown className="h-4 w-4" /> Download PDF</Button>
            </a>
          ) : q.ready && <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print or save as PDF</Button>}
          {q.catalogue_token && <Link href={`/c/${q.catalogue_token}`}><Button variant="ghost">Back to the catalogue</Button></Link>}
        </div>
        {q.status === "sent" && !q.is_expired && (
          <div className="flex gap-2">
            <Button variant="secondary" loading={answer.isPending && answer.variables === "decline"} onClick={() => { void ask("Decline this quotation?").then((ok) => { if (ok) answer.mutate("decline"); }); }}>Decline</Button>
            <Button loading={answer.isPending && answer.variables === "accept"} onClick={() => answer.mutate("accept")}><CheckCircle2 className="h-4 w-4" /> Accept quotation</Button>
          </div>
        )}
      </div>
      <p className="pt-6 text-center text-xs text-stone-400 print:hidden">Powered by MannaBooks</p>
    </main>
  );
}
