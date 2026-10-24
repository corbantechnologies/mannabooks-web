"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { RelatedDocuments } from "@/components/related-documents";
import { Meta } from "@/components/document-view";
import { TagsMeta } from "@/components/tag-pickers";
import { PurchaseDocForm } from "@/components/purchase-doc-form";
import { PurchaseLinesView } from "@/components/purchase-lines";
import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { BILL_STATUS } from "@/lib/api/purchasing";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { ask } from "@/components/confirm";

export default function BillPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const path = { params: { path: { workspace: slug, id } } };
  const [editing, setEditing] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const bill = useQuery({ queryKey: ["bill", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/bills/{id}/", path)) });
  const post = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/bills/{id}/post/", path)),
    onSuccess: () => toast.success("Bill posted"),
    onError: (e) => toast.error(e.message),
  });
  const voidIt = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/bills/{id}/void/", { ...path, body: { reason } })),
    onSuccess: () => { toast.success("Bill voided"); setVoiding(false); },
  });
  const remove = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/w/{workspace}/bills/{id}/", path)),
    onSuccess: () => { toast.success("Draft deleted"); history.back(); },
  });
  if (bill.isLoading) return <Spinner />;
  if (bill.error) return <ErrorState error={bill.error} />;
  const b = bill.data!;
  if (editing) return <div className="w-full"><PageHeader title="Edit draft bill" guide="bills" /><PurchaseDocForm kind="bill" existing={b} /></div>;
  const open = b.status === "posted" || b.status === "partially_paid";
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/purchasing/bills`} className="text-sm text-stone-500 hover:underline">&larr; Bills</Link>
      <PageHeader title={`Bill ${b.supplier_invoice_number || "(draft)"}`} description={`${b.supplier_name}${b.number ? ` · ${b.number}` : ""}`} guide="bills"
        actions={
          <div className="flex flex-wrap gap-2">
            {b.status === "draft" && can("bills.create") && <><Button variant="ghost" className="text-red-600" onClick={() => void ask("Delete this draft?").then((ok) => ok && remove.mutate())}>Delete</Button><Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button></>}
            {b.status === "draft" && can("bills.post") && <Button loading={post.isPending} onClick={() => post.mutate()}>Post bill</Button>}
            {b.status === "posted" && can("bills.void") && <Button variant="ghost" className="text-red-600" onClick={() => { voidIt.reset(); setVoiding(true); }}>Void</Button>}
            {open && can("paymentvouchers.create") && <Link href={`/w/${slug}/purchasing/vouchers/new?supplier=${b.supplier_id}&bill=${b.id}`}><Button>Pay</Button></Link>}
          </div>
        } />
      <RelatedDocuments kind="bill" id={id} />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-5">
        <Meta label="Status"><Badge tone={BILL_STATUS[b.status ?? "draft"].tone}>{BILL_STATUS[b.status ?? "draft"].label}</Badge>{b.is_overdue && <span className="ml-1"><Badge tone="red">Overdue</Badge></span>}</Meta>
        <Meta label="Bill date">{fmtDate(b.bill_date)}</Meta>
        <Meta label="Due">{fmtDate(b.due_date)}</Meta>
        <Meta label="Paid">{fmt(b.amount_paid)}</Meta>
        <Meta label="Balance">{fmt(b.balance_due)}</Meta>
        {b.goods_receipt_id && <Meta label="Goods received"><Link className="font-mono text-xs hover:underline" href={`/w/${slug}/purchasing/receipts/${b.goods_receipt_id}`}>{b.goods_receipt_number}</Link></Meta>}
        {b.purchase_order_id && <Meta label="Order"><Link className="font-mono text-xs hover:underline" href={`/w/${slug}/purchasing/orders/${b.purchase_order_id}`}>{b.purchase_order_number}</Link></Meta>}
        {b.service_order_id && <Meta label="Service order"><Link className="font-mono text-xs hover:underline" href={`/w/${slug}/purchasing/service-orders/${b.service_order_id}`}>{b.service_order_number}</Link></Meta>}
        <Meta label="eTIMS CU no.">{b.supplier_etims_number || <span className="text-amber-700">Not entered</span>}</Meta>
        <TagsMeta doc={b} />
        {b.void_reason && <Meta label="Void because">{b.void_reason}</Meta>}
      </Card>
      <PurchaseLinesView lines={b.lines ?? []} subtotal={b.subtotal} tax={b.tax_total} total={b.total} />
      {b.notes && <p className="mt-4 whitespace-pre-line text-sm text-stone-600">{b.notes}</p>}
      <Modal open={voiding} title="Void this bill" onClose={() => setVoiding(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); voidIt.mutate(); }}>
          <Field label="Reason"><Input required value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <FormError error={voidIt.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setVoiding(false)}>Cancel</Button><Button type="submit" variant="danger" loading={voidIt.isPending}>Void bill</Button></div>
        </form>
      </Modal>
    </div>
  );
}
