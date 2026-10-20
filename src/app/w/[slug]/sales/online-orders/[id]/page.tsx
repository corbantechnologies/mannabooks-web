"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { METHODS, depositFor, useDepositAccounts } from "@/lib/api/sales";
import { ONLINE_STATUS, PAYMENT_STATUS } from "@/lib/api/shop";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

type Action = { action: "confirm" | "ready" | "complete" | "cancel" | "request_payment"; method?: string; payment_reference?: string; deposit_account_id?: string | null; reason?: string };

export default function OnlineOrderPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const path = { params: { path: { workspace: slug, id } } };
  const order = useQuery({ queryKey: ["online-order", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/online-orders/{id}/", path)) });
  const deposits = useDepositAccounts(slug);
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [pay, setPay] = useState({ method: "cash", payment_reference: "", deposit_account_id: "" });
  const [reason, setReason] = useState("");
  const act = useMutation({
    mutationFn: async (body: Action) => unwrap(await api.POST("/api/v1/w/{workspace}/online-orders/{id}/action/", { ...path, body: body as never })),
    onSuccess: (o) => { toast.success(`${o.number}: ${ONLINE_STATUS[o.status][0].toLowerCase()}`); setCompleting(false); setCancelling(false); },
    onError: (e) => toast.error(e.message),
  });
  if (order.isLoading) return <Spinner />;
  if (order.error) return <ErrorState error={order.error} />;
  const o = order.data!;
  const manage = can("onlineorders.manage");
  const open = o.status !== "completed" && o.status !== "cancelled";
  const paid = o.payment_status === "paid";
  const phone = o.phone.replace(/^254/, "0");
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/sales/online-orders`} className="text-sm text-stone-500 hover:underline">&larr; Online orders</Link>
      <PageHeader title={`Online order ${o.number}`} description={`${o.customer_name} · ${fmtDate(o.created_at)}`} guide="online-shop"
        actions={manage && open && (
          <div className="flex flex-wrap gap-2">
            {o.status === "new" && <Button loading={act.isPending} onClick={() => act.mutate({ action: "confirm" })}>Confirm</Button>}
            {(o.status === "new" || o.status === "confirmed") && <Button variant={o.status === "new" ? "secondary" : "primary"} loading={act.isPending} onClick={() => act.mutate({ action: "ready" })}>Mark ready</Button>}
            <Button variant={o.status === "ready" ? "primary" : "secondary"} onClick={() => { act.reset(); setPay((p) => ({ ...p, deposit_account_id: p.deposit_account_id || depositFor(deposits.data, p.method) })); setCompleting(true); }}>
              {o.fulfilment === "delivery" ? "Delivered" : "Collected"}: complete
            </Button>
            <Button variant="ghost" className="text-red-600" onClick={() => { act.reset(); setCancelling(true); }}>Cancel</Button>
          </div>
        )} />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Badge tone={ONLINE_STATUS[o.status][1]}>{ONLINE_STATUS[o.status][0]}</Badge>
        <Badge tone={PAYMENT_STATUS[o.payment_status][1]}>{PAYMENT_STATUS[o.payment_status][0]}</Badge>
        {o.mpesa_receipt && <span className="font-mono text-xs text-stone-500">{o.mpesa_receipt}</span>}
        {o.receipt_id && <Link className="text-brand-700 underline" href={`/w/${slug}/sales/cash-sales/${o.receipt_id}`}>Cash sale {o.receipt_number}</Link>}
        {o.cancel_reason && <span className="text-stone-500">Cancelled: {o.cancel_reason}</span>}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card className="space-y-2 p-5 text-sm">
          <p className="font-medium">{o.customer_name}</p>
          <p className="flex flex-wrap gap-3">
            <a className="text-brand-700 underline" href={`tel:${phone}`}>{phone}</a>
            <a className="text-brand-700 underline" href={`https://wa.me/${o.phone}`} target="_blank" rel="noreferrer">WhatsApp</a>
            {o.email && <a className="text-brand-700 underline" href={`mailto:${o.email}`}>{o.email}</a>}
          </p>
          <p><span className="text-stone-500">{o.fulfilment === "delivery" ? "Deliver to: " : "Collects from the shop"}</span>{o.fulfilment === "delivery" ? o.address : ""}</p>
          <p><span className="text-stone-500">Pays: </span>{o.payment_method === "mpesa" ? "M-Pesa when ordering" : `on ${o.fulfilment === "delivery" ? "delivery" : "pickup"}`}</p>
          {o.notes && <p className="whitespace-pre-line border-t border-stone-100 pt-2 text-stone-700">{o.notes}</p>}
          <p className="border-t border-stone-100 pt-2 text-xs text-stone-500">
            The customer follows the order at <a className="underline" href={`/shop/${slug}/order/${o.token}`} target="_blank" rel="noreferrer">their order page</a>. Send them the link if they lost it.
          </p>
          {manage && open && o.payment_method === "mpesa" && !paid && (
            <Button variant="secondary" loading={act.isPending} onClick={() => act.mutate({ action: "request_payment" })}>Send the M-Pesa prompt again</Button>
          )}
        </Card>
        <Card>
          <ul className="divide-y divide-stone-100 text-sm">
            {o.lines.map((l) => <li key={l.product_id} className="flex justify-between px-4 py-2"><span>{Number(l.quantity)} {l.unit} × {l.name}</span><span className="font-mono">{fmt(l.total)}</span></li>)}
            {Number(o.delivery_fee) > 0 && <li className="flex justify-between px-4 py-2"><span>Delivery</span><span className="font-mono">{fmt(o.delivery_fee)}</span></li>}
            <li className="flex justify-between px-4 py-2 font-semibold"><span>Total (with VAT)</span><span className="font-mono">{fmt(o.total)}</span></li>
          </ul>
        </Card>
      </div>
      <Modal open={completing} title="Complete the order" onClose={() => setCompleting(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); act.mutate(paid ? { action: "complete" } : { action: "complete", ...pay, deposit_account_id: pay.deposit_account_id || null }); }}>
          <p className="text-sm text-stone-600">This records the cash sale for {fmt(o.total)} and takes the items out of stock.</p>
          {paid ? <p className="text-sm text-brand-700">Paid by M-Pesa ({o.mpesa_receipt}); the payment is used for the sale.</p> : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="How they paid"><Select value={pay.method} onChange={(e) => setPay((p) => ({ ...p, method: e.target.value, deposit_account_id: depositFor(deposits.data, e.target.value) }))}>{METHODS.filter((m) => m.value !== "cheque").map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
                <Field label="Received into"><Select value={pay.deposit_account_id} onChange={(e) => setPay((p) => ({ ...p, deposit_account_id: e.target.value }))}>{deposits.data.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
              </div>
              {pay.method !== "cash" && <Field label={pay.method === "mpesa" ? "M-Pesa code" : "Reference"}><Input required={pay.method === "mpesa"} value={pay.payment_reference} onChange={(e) => setPay((p) => ({ ...p, payment_reference: e.target.value.toUpperCase() }))} /></Field>}
            </>
          )}
          <FormError error={act.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setCompleting(false)}>Back</Button><Button type="submit" loading={act.isPending}>Complete</Button></div>
        </form>
      </Modal>
      <Modal open={cancelling} title="Cancel the order" onClose={() => setCancelling(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); act.mutate({ action: "cancel", reason }); }}>
          <Field label="Why?" hint="The customer sees this on their order page."><Input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Sorry, we've run out" /></Field>
          <FormError error={act.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setCancelling(false)}>Back</Button><Button type="submit" variant="danger" loading={act.isPending}>Cancel order</Button></div>
        </form>
      </Modal>
    </div>
  );
}
