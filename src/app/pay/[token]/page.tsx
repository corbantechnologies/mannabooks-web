"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, CreditCard, Loader2, Minus, Plus, Smartphone, XCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Button, Card, ErrorState, Field, FormError, Input, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { fmt } from "@/lib/format";

type Business = { name: string; phone?: string; email?: string; logo_url?: string };

/** The page a payment link opens: no sign-in. One thing to pay for, by M-Pesa or card. */
export default function PayPage() {
  const { token } = useParams<{ token: string }>();
  // back from Paystack: ?payment=<id>
  const [returned] = useState(() => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("payment")));
  const [paymentId, setPaymentId] = useState<string | null>(returned);
  const link = useQuery({
    queryKey: ["paylink", token],
    queryFn: async () => unwrap(await api.GET("/api/v1/paylinks/{token}/", { params: { path: { token } } })),
    retry: false,
  });
  if (link.isLoading) return <div className="p-8"><Spinner /></div>;
  if (link.error) return <div className="mx-auto max-w-lg p-8"><ErrorState error={link.error} /></div>;
  const l = link.data!;
  const business = l.business as unknown as Business;
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-8">
      <header className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {business.logo_url ? <img src={business.logo_url} alt="" className="h-12 max-w-[8rem] object-contain" /> : null}
        <div>
          <p className="font-semibold text-stone-900">{business.name}</p>
          <p className="text-xs text-stone-500">{[business.phone, business.email].filter(Boolean).join(" · ")}</p>
        </div>
      </header>
      {paymentId ? <PaymentStatus token={token} id={paymentId} onRetry={() => { setPaymentId(null); window.history.replaceState(null, "", window.location.pathname); }} />
        : <PayForm token={token} link={l} onStarted={setPaymentId} />}
      <p className="pt-2 text-center text-xs text-stone-400">Payments go straight to {business.name}. Powered by MannaBooks.</p>
    </main>
  );
}

type PublicLink = components["schemas"]["PublicPaymentLink"];

function PayForm({ token, link: l, onStarted }: { token: string; link: PublicLink; onStarted: (id: string) => void }) {
  const product = l.product as { name: string; description?: string; image_url?: string } | null;
  const [qty, setQty] = useState(1);
  const [form, setForm] = useState({ payer_name: "", phone: "", email: "", amount: "", note: "" });
  const methods = l.methods;
  const [method, setMethod] = useState<"mpesa" | "card">((methods[0] as "mpesa" | "card") ?? "mpesa");
  const unit = l.unit_price ? Number(l.unit_price) : null;
  const total = unit !== null ? unit * qty : Number(form.amount) || 0;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const pay = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/paylinks/{token}/pay/", {
      params: { path: { token } },
      body: { method, payer_name: form.payer_name, phone: form.phone, email: form.email, quantity: qty, amount: unit === null ? form.amount : null, note: form.note },
    })),
    onSuccess: (r) => {
      if (r.method === "card" && r.authorization_url) window.location.href = r.authorization_url;  // Paystack's page takes the card
      else onStarted(r.id);
    },
  });
  if (l.closed) return <Card className="p-6 text-center"><p className="font-medium text-stone-900">{l.title}</p><p className="mt-2 text-sm text-stone-600">{l.closed}</p></Card>;
  if (methods.length === 0) return <Card className="p-6 text-center text-sm text-stone-600">This business hasn&apos;t switched on online payments yet. Contact them to pay another way.</Card>;
  const needsEmail = method === "card" || l.purpose === "voucher";
  return (
    <Card className="overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {product?.image_url && <img src={product.image_url} alt="" className="h-48 w-full object-cover" />}
      <form className="space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); pay.mutate(); }}>
        <div>
          <h1 className="text-xl font-semibold text-stone-900">{l.title}</h1>
          {(l.description || product?.description) && <p className="mt-1 whitespace-pre-line text-sm text-stone-600">{l.description || product?.description}</p>}
        </div>
        {unit !== null ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-lg font-semibold">{l.currency} {fmt(unit)}{l.allow_quantity && <span className="text-sm font-normal text-stone-500"> each</span>}</p>
            {l.allow_quantity && (
              <div className="flex items-center gap-2" aria-label="How many">
                <button type="button" aria-label="Fewer" className="rounded-md border border-stone-300 p-1.5 disabled:opacity-40" disabled={qty <= 1} onClick={() => setQty((n) => n - 1)}><Minus className="h-4 w-4" /></button>
                <span className="w-8 text-center font-mono">{qty}</span>
                <button type="button" aria-label="More" className="rounded-md border border-stone-300 p-1.5 disabled:opacity-40" disabled={qty >= l.max_quantity} onClick={() => setQty((n) => n + 1)}><Plus className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        ) : (
          <Field label={`Amount (${l.currency})`} hint={l.min_amount ? `At least ${fmt(l.min_amount)}` : undefined}>
            <Input required type="number" inputMode="decimal" min={l.min_amount ?? "1"} step={method === "mpesa" ? "1" : "0.01"} value={form.amount} onChange={set("amount")} />
          </Field>
        )}
        <Field label="Your name"><Input required autoComplete="name" value={form.payer_name} onChange={set("payer_name")} /></Field>
        {l.purpose === "voucher" && <Field label="Who is the voucher for? (optional)" hint="Printed on the voucher."><Input value={form.note} onChange={set("note")} /></Field>}
        {methods.length > 1 && (
          <div className="grid grid-cols-2 gap-2">
            {methods.map((m) => (
              <button key={m} type="button" onClick={() => setMethod(m as "mpesa" | "card")}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium ${method === m ? "border-brand-500 bg-brand-50 text-brand-700" : "border-stone-200 text-stone-700"}`}>
                {m === "mpesa" ? <Smartphone className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}{m === "mpesa" ? "M-Pesa" : "Card"}
              </button>
            ))}
          </div>
        )}
        {method === "mpesa" && <Field label="M-Pesa number" hint="A prompt comes to this phone."><Input required inputMode="tel" autoComplete="tel" placeholder="0712 345 678" value={form.phone} onChange={set("phone")} /></Field>}
        <Field label={needsEmail ? "Email" : "Email (optional)"} hint={l.purpose === "voucher" ? "The voucher is sent here." : "For your receipt."}>
          <Input required={needsEmail} type="email" autoComplete="email" value={form.email} onChange={set("email")} />
        </Field>
        <FormError error={pay.error} />
        <Button type="submit" className="w-full justify-center" loading={pay.isPending} disabled={total <= 0}>
          Pay {l.currency} {fmt(method === "mpesa" && unit !== null ? Math.ceil(total) : total)} {method === "mpesa" ? "with M-Pesa" : "by card"}
        </Button>
        {method === "card" && <p className="text-center text-xs text-stone-500">You enter your card on Paystack&apos;s secure page.</p>}
      </form>
    </Card>
  );
}

function PaymentStatus({ token, id, onRetry }: { token: string; id: string; onRetry: () => void }) {
  const [tries, setTries] = useState(0);
  const status = useQuery({
    queryKey: ["paylink-payment", token, id],
    queryFn: async () => { setTries((n) => n + 1); return unwrap(await api.GET("/api/v1/paylinks/{token}/pay/{id}/", { params: { path: { token, id } } })); },
    refetchInterval: (q) => (q.state.data?.status === "pending" && tries < 40 ? 3000 : false),
    retry: false,
  });
  const s = status.data;
  if (status.error) return <Card className="p-5"><FormError error={status.error} /></Card>;
  if (!s || s.status === "pending") {
    return (
      <Card className="space-y-3 p-6 text-center">
        {tries >= 40 ? <p className="text-sm text-stone-600">Still waiting to hear back. If money was taken, the business will see it within a few minutes. You can close this page.</p> : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-700" />
            <p className="font-medium text-stone-900">{s?.method === "card" ? "Confirming your card payment..." : "Check your phone and enter your M-Pesa PIN."}</p>
          </>
        )}
      </Card>
    );
  }
  if (s.status === "failed") {
    return (
      <Card className="space-y-3 p-6 text-center">
        <XCircle className="mx-auto h-8 w-8 text-red-600" />
        <p className="font-medium text-stone-900">The payment didn&apos;t go through.</p>
        {s.message && <p className="text-sm text-stone-600">{s.message}</p>}
        <p className="text-sm text-stone-600">Nothing was taken.</p>
        <Button onClick={onRetry}>Try again</Button>
      </Card>
    );
  }
  return (
    <Card className="space-y-2 p-6 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
      <p className="text-lg font-semibold text-stone-900">Paid {fmt(s.amount)}. Thank you!</p>
      {s.receipt_number && <p className="text-sm text-stone-600">Receipt {s.receipt_number}</p>}
      {s.voucher_code && <p className="text-sm text-stone-600">Your gift voucher code is <span className="font-mono font-semibold">{s.voucher_code}</span>. We have emailed it to you.</p>}
    </Card>
  );
}
