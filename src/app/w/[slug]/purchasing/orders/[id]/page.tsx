"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { ActionMenu } from "@/components/action-menu";
import { RelatedDocuments } from "@/components/related-documents";
import { SendEmailDialog, openPdf } from "@/components/send-email";
import { SendToInbox } from "@/components/send-to-inbox";
import { ApprovalPanel } from "@/components/approval-panel";
import { Meta } from "@/components/document-view";
import { TagsMeta } from "@/components/tag-pickers";
import { PurchaseDocForm } from "@/components/purchase-doc-form";
import { PurchaseLinesView } from "@/components/purchase-lines";
import { Badge, Button, Card, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useApprovalStatus } from "@/lib/api/control";
import { PO_STATUS, POSTED_STATUS } from "@/lib/api/purchasing";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { ask } from "@/components/confirm";

export default function PurchaseOrderPage() {
  const { slug, can, context } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const approval = useApprovalStatus(slug, "purchase_order", id);
  const path = { params: { path: { workspace: slug, id } } };
  const [editing, setEditing] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const order = useQuery({ queryKey: ["purchase-order", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/purchase-orders/{id}/", path)) });
  const receipts = useQuery({
    queryKey: ["goods-receipts", slug, "order", id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/goods-receipts/", { params: { path: { workspace: slug }, query: { purchase_order: id } } })),
  });
  const act = useMutation({
    mutationFn: async (action: "approve" | "cancel" | "close") => unwrap(await api.POST("/api/v1/w/{workspace}/purchase-orders/{id}/action/", { ...path, body: { action } })),
    onSuccess: (o) => toast.success(`Order ${PO_STATUS[o.status ?? "draft"].label.toLowerCase()}`),
    onError: (e) => toast.error(e.message),
  });
  if (order.isLoading) return <Spinner />;
  if (order.error) return <ErrorState error={order.error} />;
  const o = order.data!;
  if (editing) return <div className="w-full"><PageHeader title={`Edit ${o.number}`} guide="purchase-orders" /><PurchaseDocForm kind="order" existing={o} /></div>;
  const receivable = o.status === "approved" || o.status === "partially_received";
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/purchasing/orders`} className="text-sm text-stone-500 hover:underline">&larr; Purchase orders</Link>
      <PageHeader title={`Purchase order ${o.number}`} description={o.supplier_name} guide="purchase-orders"
        actions={
          <div className="flex flex-wrap gap-2">
            {o.status === "draft" && can("purchaseorders.approve") && !approval.data?.required && <Button loading={act.isPending} onClick={() => act.mutate("approve")}>Approve</Button>}
            {receivable && can("goodsreceipts.manage") && <Link href={`/w/${slug}/purchasing/receipts/new?order=${o.id}`}><Button>Receive goods</Button></Link>}
            <SendToInbox kind="purchase_order" id={o.id} disabled={o.status === "draft" || o.status === "cancelled"} />
            <ActionMenu actions={[
              { label: "Download PDF", onClick: () => openPdf(slug, "purchase_order", o.id), hidden: !context.pdf_enabled || o.status === "draft" },
              { label: "Send to supplier by email", onClick: () => setEmailing(true), hidden: !(o.status !== "draft" && o.status !== "cancelled" && can("purchaseorders.create")) },
              { label: "Print LPO or save as PDF", href: `/w/${slug}/purchasing/orders/${o.id}/print`, hidden: o.status === "draft" },
              { label: "Edit", onClick: () => setEditing(true), hidden: !(o.status === "draft" && can("purchaseorders.create")) },
              { label: "Enter the bill", href: `/w/${slug}/purchasing/bills/new?order=${o.id}`, hidden: !(receivable && !(receipts.data?.results ?? []).some((g) => g.status === "posted") && can("bills.create")) },
              { label: "Close (stop waiting for the rest)", onClick: () => { void ask("Stop waiting for the rest?").then((ok) => { if (ok) act.mutate("close"); }); }, hidden: !(o.status === "partially_received" && can("purchaseorders.create")) },
              { label: "Cancel order", danger: true, onClick: () => { void ask("Cancel this order?").then((ok) => { if (ok) act.mutate("cancel"); }); }, hidden: !((o.status === "draft" || o.status === "approved") && can("purchaseorders.create")) },
            ]} />
          </div>
        } />
      <RelatedDocuments kind="purchase_order" id={id} />
      <SendEmailDialog docType="purchase_order" id={o.id} open={emailing} onClose={() => setEmailing(false)} />
      <ApprovalPanel docType="purchase_order" id={id} />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-5">
        <Meta label="Status"><Badge tone={PO_STATUS[o.status ?? "draft"].tone}>{PO_STATUS[o.status ?? "draft"].label}</Badge></Meta>
        <Meta label="Date">{fmtDate(o.order_date)}</Meta>
        <Meta label="Expected">{o.expected_date ? fmtDate(o.expected_date) : "-"}</Meta>
        <Meta label="Deliver to">{o.warehouse_name ?? "Default warehouse"}</Meta>
        <Meta label="Approved by">{o.approved_by_name ?? "-"}</Meta>
        <TagsMeta doc={o} />
      </Card>
      <PurchaseLinesView lines={o.lines ?? []} subtotal={o.subtotal} tax={o.tax_total} total={o.total}
        extra={(l) => `${Number((l as { received_quantity?: string }).received_quantity ?? 0)} of ${Number(l.quantity)} received`} />
      {(receipts.data?.results ?? []).length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold">Goods received</h2>
          <Card>
            <Table head={["Date", "Number", "Value", "Status"]}>
              {receipts.data!.results.map((g) => (
                <tr key={g.id}><Td>{fmtDate(g.receipt_date)}</Td><Td><Link className="font-mono text-xs hover:underline" href={`/w/${slug}/purchasing/receipts/${g.id}`}>{g.number}</Link></Td>
                  <Td className="text-right font-mono">{fmt(g.total_value)}</Td><Td><Badge tone={POSTED_STATUS[g.status ?? "posted"].tone}>{POSTED_STATUS[g.status ?? "posted"].label}</Badge></Td></tr>
              ))}
            </Table>
          </Card>
        </div>
      )}
      {o.notes && <p className="mt-4 whitespace-pre-line text-sm text-stone-600">{o.notes}</p>}
    </div>
  );
}
