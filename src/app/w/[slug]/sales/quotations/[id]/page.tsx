"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { ActionMenu } from "@/components/action-menu";
import { RelatedDocuments } from "@/components/related-documents";
import { SendEmailDialog } from "@/components/send-email";
import { DocumentLines, Meta } from "@/components/document-view";
import { TagsMeta } from "@/components/tag-pickers";
import { SalesDocForm } from "@/components/sales-doc-form";
import { Badge, Button, Card, ErrorState, PageHeader, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { QUOTE_STATUS } from "@/lib/api/sales";
import { useWorkspace } from "@/lib/workspace";

export default function QuotationPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const path = { params: { path: { workspace: slug, id } } };
  const [editing, setEditing] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const quote = useQuery({ queryKey: ["quotation", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/quotations/{id}/", path)) });
  const act = useMutation({
    mutationFn: async (action: "send" | "accept" | "decline" | "reopen") => unwrap(await api.POST("/api/v1/w/{workspace}/quotations/{id}/status/", { ...path, body: { action } })),
    onError: (e) => toast.error(e.message),
  });
  const convert = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/quotations/{id}/convert/", path)),
    onSuccess: (r) => { toast.success("Draft invoice created"); router.push(`/w/${slug}/sales/invoices/${r.invoice_id}`); },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/w/{workspace}/quotations/{id}/", path)),
    onSuccess: () => { toast.success("Quotation deleted"); router.replace(`/w/${slug}/sales/quotations`); },
    onError: (e) => toast.error(e.message),
  });
  if (quote.isLoading) return <Spinner />;
  if (quote.error) return <ErrorState error={quote.error} />;
  const q = quote.data!;
  if (editing) return <div className="w-full"><PageHeader title={`Edit ${q.number}`} guide="quotations" /><SalesDocForm kind="quotation" existing={q} /></div>;
  const manage = can("quotations.manage");
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/sales/quotations`} className="text-sm text-stone-500 hover:underline">&larr; Quotations</Link>
      <PageHeader
        title={`Quotation ${q.number}`}
        description={q.customer_name}
        guide="quotations"
        actions={
          <div className="flex flex-wrap gap-2">
            {can("invoices.create") && ["draft", "sent", "accepted"].includes(q.status) && <Button loading={convert.isPending} onClick={() => convert.mutate()}>Convert to invoice</Button>}
            {q.status === "converted" && q.invoice_id && <Link href={`/w/${slug}/sales/invoices/${q.invoice_id}`}><Button>Open invoice</Button></Link>}
            <ActionMenu actions={[
              { label: "Send by email", onClick: () => setEmailing(true), hidden: !manage },
              { label: "Print or save as PDF", href: `/w/${slug}/sales/quotations/${q.id}/print` },
              { label: "Edit", onClick: () => setEditing(true), hidden: !(manage && ["draft", "sent"].includes(q.status)) },
              { label: "Mark as sent", onClick: () => act.mutate("send"), hidden: !(manage && q.status === "draft") },
              { label: "Customer accepted", onClick: () => act.mutate("accept"), hidden: !(manage && ["draft", "sent"].includes(q.status)) },
              { label: "Customer declined", onClick: () => act.mutate("decline"), hidden: !(manage && ["draft", "sent"].includes(q.status)) },
              { label: "Reopen", onClick: () => act.mutate("reopen"), hidden: !(manage && ["accepted", "declined"].includes(q.status)) },
              { label: "Delete", danger: true, onClick: () => { if (confirm("Delete this quotation?")) remove.mutate(); }, hidden: !(manage && ["draft", "declined"].includes(q.status)) },
            ]} />
          </div>
        }
      />
      <RelatedDocuments kind="quotation" id={id} />
      <SendEmailDialog docType="quotation" id={q.id} open={emailing} onClose={() => setEmailing(false)} />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-4">
        <Meta label="Status"><Badge tone={QUOTE_STATUS[q.status].tone}>{QUOTE_STATUS[q.status].label}</Badge>{q.is_expired && <span className="ml-1"><Badge tone="red">Expired</Badge></span>}</Meta>
        <Meta label="Date">{fmtDate(q.issue_date)}</Meta>
        <Meta label="Valid until">{fmtDate(q.valid_until)}</Meta>
        <Meta label="Customer's reference">{q.reference || "-"}</Meta>
        <TagsMeta doc={q} />
      </Card>
      <DocumentLines lines={q.lines ?? []} subtotal={q.subtotal} tax={q.tax_total} total={q.total} currency={q.currency ?? ""} />
      {q.notes && <p className="mt-4 whitespace-pre-line text-sm text-stone-600">{q.notes}</p>}
    </div>
  );
}
