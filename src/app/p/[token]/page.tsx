"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CreditCard, Loader2, Smartphone, XCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge, Button, Card, ErrorState, Field, FormError, Input, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";

interface PortalInvoice {
  id: string; number: string; kind: string; issue_date: string; due_date: string; status: string; currency: string;
  subtotal: string; tax_total: string; total: string; amount_paid: string; balance_due: string; etims_cu_invoice_number: string;
  lines: { description: string; quantity: string; unit_price: string; tax_rate_name: string | null; total_amount: string }[];
}

/** What a customer sees from a shared link: no sign-in. */
export default function PortalPage() {
  const { token } = useParams<{ token: string }>();
  // Paystack sends the customer back here with ?reference=...
  const [cardRef] = useState(() => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("reference")));
  const portal = useQuery({
    queryKey: ["portal", token],
    queryFn: async () => unwrap(await api.GET("/api/v1/portal/{token}/", { params: { path: { token } } })),
    retry: false,
  });
  if (portal.isLoading) return <div className="p-8"><Spinner /></div>;
  if (portal.error) return <div className="mx-auto max-w-lg p-8"><ErrorState error={portal.error} /></div>;
  const p = portal.data!;
  const business = p.business as Record<string, string>;
  const invoices = p.invoices as unknown as PortalInvoice[];
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{business.name}</h1>
          <p className="text-sm text-stone-500">{[business.phone, business.email].filter(Boolean).join(" · ")}</p>
          {business.kra_pin && <p className="text-sm text-stone-500">KRA PIN {business.kra_pin}</p>}
        </div>
        <div className="text-right text-sm">
          <p className="text-stone-500">For</p>
          <p className="font-medium">{(p.customer as Record<string, string>).name}</p>
        </div>
      </header>
      {((p.business as { pay_to?: string[][] }).pay_to ?? []).length > 0 && (
        <Card className="p-4">
          <p className="mb-2 text-sm font-semibold text-stone-900">How to pay</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(p.business as { pay_to?: string[][] }).pay_to!.map((lines, i) => (
              <div key={i} className="text-sm text-stone-700">{lines.map((l) => <p key={l}>{l}</p>)}</div>
            ))}
          </div>
        </Card>
      )}
      {p.scope === "statement" && (
        <Card className="p-4">
          <p className="text-sm text-stone-500">You owe</p>
          <p className="text-2xl font-semibold">{fmt(p.balance)}</p>
        </Card>
      )}
      {cardRef && <CardReturn token={token} reference={cardRef} />}
      {invoices.length === 0 && <Card className="p-6 text-center text-sm text-stone-600">Nothing to pay. Thank you!</Card>}
      {invoices.map((inv) => <PortalInvoiceCard key={inv.id} token={token} invoice={inv} mpesa={p.mpesa_available} card={p.card_available} email={p.customer_email} />)}
      <p className="pt-4 text-center text-xs text-stone-400">Sent with MannaBooks</p>
    </main>
  );
}

/** Back from Paystack: wait for the payment to be confirmed, then show the invoices as they now stand. */
function CardReturn({ token, reference }: { token: string; reference: string }) {
  const qc = useQueryClient();
  const [tries, setTries] = useState(0);
  const status = useQuery({
    queryKey: ["portal-card", token, reference],
    queryFn: async () => { setTries((n) => n + 1); return unwrap(await api.GET("/api/v1/portal/{token}/card/{reference}/", { params: { path: { token, reference } } })); },
    refetchInterval: (q) => (q.state.data?.status === "pending" && tries < 20 ? 3000 : false),
    retry: false,
  });
  const state = status.data?.status;
  useEffect(() => {
    if (state && state !== "pending") {
      window.history.replaceState(null, "", window.location.pathname);  // a refresh shouldn't check again
      if (state === "success") void qc.invalidateQueries({ queryKey: ["portal", token] });
    }
  }, [state, qc, token]);
  if (status.error) return <Card className="p-4"><FormError error={status.error} /></Card>;
  return (
    <Card className="p-4 text-sm">
      {state === "success" ? (
        <p className="flex items-center gap-2 text-green-700"><CheckCircle2 className="h-5 w-5" /> Paid {fmt(status.data!.amount)} by card for {status.data!.invoice_number}. Thank you! Your bank or card statement shows Paystack.</p>
      ) : state === "failed" || state === "abandoned" ? (
        <p className="flex items-center gap-2 text-red-600"><XCircle className="h-5 w-5" /> The card payment didn&apos;t go through{status.data!.message ? ` (${status.data!.message})` : ""}. Nothing was taken. Try again below.</p>
      ) : state === "pending" && tries >= 20 ? (
        <p className="text-stone-600">We haven&apos;t heard from the card company yet. If money was taken, the payment will show here within a few minutes. Refresh this page later.</p>
      ) : (
        <p className="flex items-center gap-2 text-stone-700"><Loader2 className="h-5 w-5 animate-spin text-brand-700" /> Confirming your card payment...</p>
      )}
    </Card>
  );
}

function PortalInvoiceCard({ token, invoice, mpesa, card, email: knownEmail }: { token: string; invoice: PortalInvoice; mpesa: boolean; card: boolean; email: string }) {
  const [paying, setPaying] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [email, setEmail] = useState(knownEmail);
  const cardPay = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/portal/{token}/card/", {
      params: { path: { token } }, body: { invoice_id: invoice.id, amount: invoice.balance_due, email },
    })),
    onSuccess: (r) => { window.location.href = r.authorization_url; },  // Paystack's own page takes the card details
  });
  const [phone, setPhone] = useState("");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const open = invoice.status === "issued" || invoice.status === "partially_paid";
  const pay = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/portal/{token}/pay/", {
      params: { path: { token } }, body: { invoice_id: invoice.id, phone, amount: String(Math.floor(Number(invoice.balance_due))) },
    })),
    onSuccess: (r) => setPaymentId(r.id),
  });
  const status = useQuery({
    queryKey: ["portal-payment", token, paymentId],
    enabled: Boolean(paymentId),
    queryFn: async () => unwrap(await api.GET("/api/v1/portal/{token}/pay/{id}/", { params: { path: { token, id: paymentId! } } })),
    refetchInterval: (q) => (q.state.data?.status === "pending" || !q.state.data ? 3000 : false),
  });
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-stone-50 px-4 py-3">
        <div>
          <p className="font-medium">{invoice.kind === "debit_note" ? "Debit note" : "Invoice"} {invoice.number}</p>
          <p className="text-xs text-stone-500">Dated {fmtDate(invoice.issue_date)} · due {fmtDate(invoice.due_date)}</p>
        </div>
        {open ? <Badge tone="amber">{fmt(invoice.balance_due)} to pay</Badge> : <Badge tone="green">Paid</Badge>}
      </div>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-stone-100">
          {invoice.lines.map((l, i) => (
            <tr key={i}><td className="px-4 py-2">{l.description}<div className="text-xs text-stone-500">{Number(l.quantity)} x {fmt(l.unit_price)}</div></td><td className="px-4 py-2 text-right font-mono">{fmt(l.total_amount)}</td></tr>
          ))}
          <tr><td className="px-4 py-1 text-right text-stone-500">VAT</td><td className="px-4 py-1 text-right font-mono">{fmt(invoice.tax_total)}</td></tr>
          <tr className="font-semibold"><td className="px-4 py-2 text-right">Total {invoice.currency}</td><td className="px-4 py-2 text-right font-mono">{fmt(invoice.total)}</td></tr>
        </tbody>
      </table>
      {invoice.etims_cu_invoice_number && <p className="px-4 pb-2 text-xs text-stone-500">KRA eTIMS: {invoice.etims_cu_invoice_number}</p>}
      {open && card && (
        <div className="border-t border-stone-200 p-4">
          {!cardOpen ? (
            <Button variant={mpesa ? "secondary" : "primary"} onClick={() => (knownEmail ? cardPay.mutate() : setCardOpen(true))} loading={cardPay.isPending}>
              <CreditCard className="h-4 w-4" /> Pay {fmt(invoice.balance_due)} by card
            </Button>
          ) : (
            <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); cardPay.mutate(); }}>
              <div className="w-64"><Field label="Your email, for the receipt"><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field></div>
              <Button type="submit" loading={cardPay.isPending}>Continue to card payment</Button>
            </form>
          )}
          <p className="mt-2 text-xs text-stone-500">You enter your card on Paystack&apos;s secure page; this business never sees your card number.</p>
          <FormError error={cardPay.error} />
        </div>
      )}
      {open && mpesa && (
        <div className="border-t border-stone-200 p-4">
          {status.data?.status === "completed" ? (
            <p className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 className="h-5 w-5" /> Paid. M-Pesa code {status.data.mpesa_receipt}. Thank you!</p>
          ) : paymentId && status.data?.status !== "failed" && status.data?.status !== "cancelled" ? (
            <p className="flex items-center gap-2 text-sm"><Smartphone className="h-5 w-5 animate-pulse text-brand-700" /> Check your phone and enter your M-Pesa PIN.</p>
          ) : !paying ? (
            <Button onClick={() => setPaying(true)}>Pay {fmt(Math.floor(Number(invoice.balance_due)))} with M-Pesa</Button>
          ) : (
            <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); setPaymentId(null); pay.mutate(); }}>
              <div className="w-56"><Field label="Your M-Pesa number"><Input required inputMode="tel" placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field></div>
              <Button type="submit" loading={pay.isPending}>Send prompt</Button>
              {(status.data?.status === "failed" || status.data?.status === "cancelled") && <p className="w-full text-sm text-red-600">The payment didn&apos;t go through. Try again.</p>}
              <div className="w-full"><FormError error={pay.error} /></div>
            </form>
          )}
        </div>
      )}
    </Card>
  );
}
