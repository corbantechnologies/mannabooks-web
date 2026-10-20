"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Smartphone } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Badge, Button, Card, ErrorState, Field, FormError, Input, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";

const STATUS: Record<string, [string, string]> = {
  new: ["Received", "The shop has your order and will confirm it shortly."],
  confirmed: ["Confirmed", "The shop is getting your order ready."],
  ready: ["Ready", "Your order is ready."],
  completed: ["Completed", "Thank you for your order."],
  cancelled: ["Cancelled", ""],
};

/** The customer's page for one order: what they ordered, where it is, and paying by M-Pesa. Bookmark it to check back. */
export default function OrderPage() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [phone, setPhone] = useState("");
  const order = useQuery({
    queryKey: ["shop-order", slug, token], retry: false,
    queryFn: async () => unwrap(await api.GET("/api/v1/store/{slug}/orders/{token}/", { params: { path: { slug, token } } })),
    refetchInterval: (q) => (q.state.data?.payment_status === "pending" ? 4000 : 30000),
  });
  const pay = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/store/{slug}/orders/{token}/pay/", { params: { path: { slug, token } }, body: { phone } })),
  });
  if (order.isLoading) return <div className="p-8"><Spinner /></div>;
  if (order.error) return <div className="mx-auto max-w-lg p-8"><ErrorState error={order.error} /></div>;
  const o = order.data!;
  const [label, text] = STATUS[o.status];
  const open = o.status !== "completed" && o.status !== "cancelled";
  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 py-8">
      <header>
        <Link href={`/shop/${slug}`} className="text-sm text-stone-500 hover:underline">&larr; {o.shop_name}</Link>
        <h1 className="mt-2 text-xl font-semibold">Order {o.number}</h1>
        <p className="text-sm text-stone-500">Placed {fmtDate(o.created_at)} by {o.customer_name}. Keep this page to check on your order.</p>
      </header>
      <Card className="p-4">
        <p className="flex items-center gap-2 font-medium">
          {o.status === "completed" || o.status === "ready" ? <CheckCircle2 className="h-5 w-5 text-brand-600" /> : null}
          <Badge tone={o.status === "cancelled" ? "stone" : o.status === "new" ? "blue" : "green"}>{label}</Badge>
          <span className="text-sm text-stone-600">{o.status === "ready" ? (o.fulfilment === "delivery" ? "It's on its way." : "Come and collect it.") : text}</span>
        </p>
        {o.cancel_reason && <p className="mt-2 text-sm text-stone-600">{o.cancel_reason}</p>}
        {o.shop_phone && <p className="mt-2 text-sm text-stone-500">Questions? Call {o.shop_phone}.</p>}
      </Card>
      <Card>
        <ul className="divide-y divide-stone-100 text-sm">
          {o.lines.map((l) => <li key={l.product_id} className="flex justify-between px-4 py-2"><span>{Number(l.quantity)} × {l.name}</span><span className="font-mono">{fmt(l.total)}</span></li>)}
          {Number(o.delivery_fee) > 0 && <li className="flex justify-between px-4 py-2"><span>Delivery to {o.address}</span><span className="font-mono">{fmt(o.delivery_fee)}</span></li>}
          <li className="flex justify-between px-4 py-2 font-semibold"><span>Total</span><span className="font-mono">{fmt(o.total)}</span></li>
        </ul>
      </Card>
      {o.payment_status === "paid" ? (
        <Card className="flex items-center gap-2 p-4 text-sm text-brand-700"><CheckCircle2 className="h-5 w-5" /> Paid by M-Pesa. Thank you.</Card>
      ) : o.payment_status === "pending" ? (
        <Card className="flex items-center gap-2 p-4 text-sm"><Smartphone className="h-5 w-5 text-brand-600" /> Check your phone and enter your M-Pesa PIN. This page updates when it goes through.</Card>
      ) : open && o.payment_method === "mpesa" ? (
        <Card className="space-y-3 p-4">
          <p className="text-sm text-stone-700">Not paid yet. Send an M-Pesa prompt to your phone:</p>
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); pay.mutate(); }}>
            <div className="min-w-48 flex-1"><Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={o.phone} /></Field></div>
            <Button type="submit" loading={pay.isPending}><Smartphone className="h-4 w-4" /> Pay {fmt(Math.ceil(Number(o.total)))}</Button>
          </form>
          <FormError error={pay.error} />
        </Card>
      ) : open ? (
        <Card className="p-4 text-sm text-stone-600">You pay when you {o.fulfilment === "delivery" ? "receive" : "collect"} your order.</Card>
      ) : null}
    </main>
  );
}
