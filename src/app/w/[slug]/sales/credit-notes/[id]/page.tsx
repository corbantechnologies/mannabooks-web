"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { RelatedDocuments } from "@/components/related-documents";
import { SendEmailButton } from "@/components/send-email";
import { DocumentLines, EtimsMeta, Meta } from "@/components/document-view";
import { Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Spinner } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function CreditNotePage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const path = { params: { path: { workspace: slug, id } } };
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const note = useQuery({ queryKey: ["credit-note", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/credit-notes/{id}/", path)) });
  const voidIt = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/credit-notes/{id}/void/", { ...path, body: { reason } })),
    onSuccess: () => { toast.success("Credit note voided"); setVoiding(false); },
  });
  if (note.isLoading) return <Spinner />;
  if (note.error) return <ErrorState error={note.error} />;
  const c = note.data!;
  return (
    <div className="max-w-6xl">
      <Link href={`/w/${slug}/sales/credit-notes`} className="text-sm text-stone-500 hover:underline">&larr; Credit notes</Link>
      <PageHeader
        title={`Credit note ${c.number}`}
        description={c.customer_name}
        guide="credit-notes"
        actions={
          <div className="flex gap-2">
            {c.status === "issued" && can("creditnotes.create") && <SendEmailButton docType="credit_note" id={c.id} />}
            <Link href={`/w/${slug}/sales/credit-notes/${c.id}/print`}><Button variant="secondary"><Printer className="h-4 w-4" /> Print</Button></Link>
            {c.status === "issued" && can("creditnotes.void") && <Button variant="secondary" onClick={() => { voidIt.reset(); setVoiding(true); }}>Void</Button>}
          </div>
        }
      />
      <RelatedDocuments kind="credit_note" id={id} />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-5">
        <Meta label="Date">{fmtDate(c.issue_date)}</Meta>
        <Meta label="Invoice">{c.invoice_id ? <Link href={`/w/${slug}/sales/invoices/${c.invoice_id}`} className="font-mono text-xs hover:underline">{c.invoice_number}</Link> : "-"}</Meta>
        <Meta label="Applied to invoice">{fmt(c.applied_amount)}</Meta>
        <Meta label="Kept as credit">{fmt(c.unapplied_amount)}</Meta>
        <EtimsMeta status={c.etims_status} cu={c.etims_cu_invoice_number} />
        <Meta label="Reason">{c.reason}</Meta>
        {c.status === "void" && <Meta label="Void because">{c.void_reason}</Meta>}
      </Card>
      <DocumentLines lines={c.lines ?? []} subtotal={c.subtotal} tax={c.tax_total} total={c.total} currency={c.currency ?? ""} />
      <Modal open={voiding} title={`Void ${c.number}`} onClose={() => setVoiding(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); voidIt.mutate(); }}>
          <Field label="Reason" error={fieldError(voidIt.error, "reason")}><Input required value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <FormError error={voidIt.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setVoiding(false)}>Cancel</Button><Button type="submit" variant="danger" loading={voidIt.isPending}>Void credit note</Button></div>
        </form>
      </Modal>
    </div>
  );
}
