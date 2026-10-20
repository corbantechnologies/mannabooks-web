"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { RelatedDocuments } from "@/components/related-documents";
import { ApprovalPanel } from "@/components/approval-panel";
import { Meta } from "@/components/document-view";
import { TagsMeta } from "@/components/tag-pickers";
import { PurchaseDocForm } from "@/components/purchase-doc-form";
import { PurchaseLinesView } from "@/components/purchase-lines";
import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useApprovalStatus } from "@/lib/api/control";
import { SO_STATUS } from "@/lib/api/purchasing";
import { fmtDate, todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function ServiceOrderPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const approval = useApprovalStatus(slug, "service_order", id);
  const path = { params: { path: { workspace: slug, id } } };
  const [editing, setEditing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState({ completion_date: todayIso(), rating: "", notes: "" });
  const order = useQuery({ queryKey: ["service-order", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/service-orders/{id}/", path)) });
  const completion = useQuery({
    queryKey: ["service-completions", slug, id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/service-completions/", { params: { path: { workspace: slug }, query: { service_order: id } } })),
  });
  const act = useMutation({
    mutationFn: async (action: "approve" | "cancel") => unwrap(await api.POST("/api/v1/w/{workspace}/service-orders/{id}/action/", { ...path, body: { action } })),
    onSuccess: (o) => toast.success(`Service order ${SO_STATUS[o.status ?? "draft"].label.toLowerCase()}`),
    onError: (e) => toast.error(e.message),
  });
  const complete = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/service-completions/", {
      ...wsPath(slug), body: { service_order_id: id, completion_date: done.completion_date, rating: done.rating ? Number(done.rating) : null, notes: done.notes },
    })),
    onSuccess: () => { toast.success("Work confirmed as done"); setCompleting(false); },
  });
  if (order.isLoading) return <Spinner />;
  if (order.error) return <ErrorState error={order.error} />;
  const o = order.data!;
  if (editing) return <div className="max-w-6xl"><PageHeader title={`Edit ${o.number}`} guide="service-orders" /><PurchaseDocForm kind="service" existing={o} /></div>;
  const c = completion.data?.results[0];
  return (
    <div className="max-w-6xl">
      <Link href={`/w/${slug}/purchasing/service-orders`} className="text-sm text-stone-500 hover:underline">&larr; Service orders</Link>
      <PageHeader title={`Service order ${o.number}`} description={o.supplier_name} guide="service-orders"
        actions={
          <div className="flex flex-wrap gap-2">
            {o.status === "draft" && can("purchaseorders.create") && <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>}
            {(o.status === "draft" || o.status === "approved") && can("purchaseorders.create") && <Button variant="ghost" className="text-red-600" onClick={() => confirm("Cancel this order?") && act.mutate("cancel")}>Cancel order</Button>}
            {o.status === "draft" && can("purchaseorders.approve") && !approval.data?.required && <Button onClick={() => act.mutate("approve")}>Approve</Button>}
            {o.status === "approved" && can("purchaseorders.create") && <Button onClick={() => setCompleting(true)}>Confirm work done</Button>}
            {o.status !== "draft" && o.status !== "cancelled" && can("bills.create") && <Link href={`/w/${slug}/purchasing/bills/new?service=${o.id}`}><Button variant="secondary">Enter bill</Button></Link>}
          </div>
        } />
      <RelatedDocuments kind="service_order" id={id} />
      <ApprovalPanel docType="service_order" id={id} />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-4">
        <Meta label="Status"><Badge tone={SO_STATUS[o.status ?? "draft"].tone}>{SO_STATUS[o.status ?? "draft"].label}</Badge></Meta>
        <Meta label="Date">{fmtDate(o.order_date)}</Meta>
        <Meta label="Needed by">{o.required_by ? fmtDate(o.required_by) : "-"}</Meta>
        <Meta label="Approved by">{o.approved_by_name ?? "-"}</Meta>
        <TagsMeta doc={o} />
        {o.scope && <div className="sm:col-span-4"><Meta label="Work to be done"><span className="whitespace-pre-line">{o.scope}</span></Meta></div>}
        {c && <div className="sm:col-span-4"><Meta label="Completed">{fmtDate(c.completion_date)} · confirmed by {c.confirmed_by_name}{c.rating ? ` · rated ${c.rating}/5` : ""}{c.notes ? ` · ${c.notes}` : ""}</Meta></div>}
      </Card>
      <PurchaseLinesView lines={o.lines ?? []} subtotal={o.subtotal} tax={o.tax_total} total={o.total} />
      <Modal open={completing} title="Confirm the work is done" onClose={() => setCompleting(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); complete.mutate(); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Finished on"><Input type="date" required value={done.completion_date} onChange={(e) => setDone((p) => ({ ...p, completion_date: e.target.value }))} /></Field>
            <Field label="How well was it done?">
              <Select value={done.rating} onChange={(e) => setDone((p) => ({ ...p, rating: e.target.value }))}>
                <option value="">Not rated</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} / 5</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Notes" hint="What was done, and anything still outstanding."><Textarea value={done.notes} onChange={(e) => setDone((p) => ({ ...p, notes: e.target.value }))} /></Field>
          <FormError error={complete.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setCompleting(false)}>Cancel</Button><Button type="submit" loading={complete.isPending}>Confirm</Button></div>
        </form>
      </Modal>
    </div>
  );
}
