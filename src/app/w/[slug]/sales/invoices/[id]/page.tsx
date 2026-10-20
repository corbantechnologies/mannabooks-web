"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { ActionMenu } from "@/components/action-menu";
import { RelatedDocuments } from "@/components/related-documents";
import { SendEmailDialog } from "@/components/send-email";
import { DocumentLines, EtimsMeta, Meta } from "@/components/document-view";
import { TagsMeta } from "@/components/tag-pickers";
import { MpesaPromptModal } from "@/components/mpesa-prompt";
import { SalesDocForm } from "@/components/sales-doc-form";
import { ShareLinkModal } from "@/components/share-link";
import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { INVOICE_STATUS, METHODS, useDepositAccounts } from "@/lib/api/sales";
import { fmt, fmtDate, todayIso } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

interface AppliedRow { kind: string; id: string; number: string; date: string; amount: string }

export default function InvoicePage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const path = { params: { path: { workspace: slug, id } } };
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const [prompting, setPrompting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const deposits = useDepositAccounts(slug);
  const [pay, setPay] = useState({ amount: "", method: "mpesa", reference: "", deposit_account_id: "", payment_date: todayIso() });

  const invoice = useQuery({ queryKey: ["invoice", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/invoices/{id}/", path)) });
  const issue = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/invoices/{id}/issue/", path)),
    onSuccess: (i) => toast.success(`Issued as ${i.number}`),
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/w/{workspace}/invoices/{id}/", path)),
    onSuccess: () => { toast.success("Draft deleted"); router.replace(`/w/${slug}/sales/invoices`); },
    onError: (e) => toast.error(e.message),
  });
  const voidIt = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/invoices/{id}/void/", { ...path, body: { reason } })),
    onSuccess: () => { toast.success("Invoice voided"); setVoiding(false); },
  });
  const remind = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/reminders/send/", { params: { path: { workspace: slug } }, body: { invoice_id: id } })),
    onSuccess: (r) => toast.success(r.error ? `Not sent: ${r.error}` : `Reminder emailed to ${r.sent_to}`),
    onError: (e) => toast.error(e.message),
  });
  const recordPayment = useMutation({
    mutationFn: async () => {
      const inv = invoice.data!;
      return unwrap(await api.POST("/api/v1/w/{workspace}/payments/", {
        params: { path: { workspace: slug } },
        body: {
          customer_id: inv.customer_id, payment_date: pay.payment_date, amount: pay.amount, method: pay.method as "mpesa",
          reference: pay.reference, deposit_account_id: pay.deposit_account_id,
          allocations: [{ invoice_id: inv.id, amount: String(Math.min(Number(pay.amount) || 0, Number(inv.balance_due))) }],
        },
      }));
    },
    onSuccess: (p) => { toast.success(`Payment ${p.number} recorded`); setPaying(false); },
  });

  if (invoice.isLoading) return <Spinner />;
  if (invoice.error) return <ErrorState error={invoice.error} />;
  const inv = invoice.data!;
  if (editing) {
    return (
      <div className="w-full">
        <PageHeader title={inv.kind === "debit_note" ? "Edit draft debit note" : "Edit draft invoice"} guide="invoices" />
        <SalesDocForm kind={inv.kind === "debit_note" ? "debit_note" : "invoice"} existing={inv} />
      </div>
    );
  }
  const open = inv.status === "issued" || inv.status === "partially_paid";
  const issued = inv.status !== "draft" && inv.status !== "void";  // paid invoices too: they can still be credited
  const debit = inv.kind === "debit_note";
  const label = debit ? "Debit note" : "Invoice";

  function openPayment() {
    recordPayment.reset();
    setPay((prev) => ({ ...prev, amount: String(Number(inv.balance_due)), deposit_account_id: prev.deposit_account_id || deposits.data[0]?.id || "" }));
    setPaying(true);
  }

  return (
    <div className="w-full">
      <Link href={`/w/${slug}/sales/${debit ? "debit-notes" : "invoices"}`} className="text-sm text-stone-500 hover:underline">&larr; {debit ? "Debit notes" : "Invoices"}</Link>
      <PageHeader
        title={inv.number ? `${label} ${inv.number}` : `Draft ${label.toLowerCase()}`}
        description={debit && inv.original_invoice_number ? `${inv.customer_name} · adds to invoice ${inv.original_invoice_number}` : inv.customer_name}
        guide="invoices"
        actions={
          <div className="flex flex-wrap gap-2">
            {inv.status === "draft" && can("invoices.issue") && <Button loading={issue.isPending} onClick={() => issue.mutate()}>Issue invoice</Button>}
            {open && can("payments.create") && <Button onClick={openPayment}>Record payment</Button>}
            <ActionMenu actions={[
              { label: "Edit", onClick: () => setEditing(true), hidden: !(inv.status === "draft" && can("invoices.create")) },
              { label: "Send by email", onClick: () => setEmailing(true), hidden: !(issued && can("invoices.create")) },
              { label: "Print or save as PDF", href: `/w/${slug}/sales/invoices/${inv.id}/print`, hidden: inv.status === "draft" },
              { label: "M-Pesa payment prompt", onClick: () => setPrompting(true), hidden: !(open && can("receipts.create")) },
              { label: "Share link with customer", onClick: () => setSharing(true), hidden: !(issued && can("customers.manage")) },
              { label: "Email a payment reminder", onClick: () => remind.mutate(), hidden: !open },
              { label: "Credit note (returns, discounts)", href: `/w/${slug}/sales/credit-notes/new?invoice=${inv.id}`, hidden: !(issued && can("creditnotes.create")) },
              { label: "Debit note (charge more)", href: `/w/${slug}/sales/debit-notes/new?invoice=${inv.id}`, hidden: !(issued && !debit && can("invoices.create")) },
              { label: "Delivery note", href: `/w/${slug}/sales/delivery-notes/new?invoice=${inv.id}`, hidden: !(issued && can("deliverynotes.manage")) },
              { label: "Void invoice", danger: true, onClick: () => { voidIt.reset(); setVoiding(true); }, hidden: !(open && can("invoices.void") && Number(inv.amount_paid) === 0) },
              { label: "Delete draft", danger: true, onClick: () => { if (confirm("Delete this draft?")) remove.mutate(); }, hidden: !(inv.status === "draft" && can("invoices.create")) },
            ]} />
          </div>
        }
      />
      <RelatedDocuments kind="invoice" id={id} />
      <SendEmailDialog docType="invoice" id={inv.id} open={emailing} onClose={() => setEmailing(false)} />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-5">
        <Meta label="Status">
          <Badge tone={INVOICE_STATUS[inv.status].tone}>{INVOICE_STATUS[inv.status].label}</Badge>
          {inv.is_overdue && <span className="ml-1"><Badge tone="red">Overdue</Badge></span>}
        </Meta>
        <Meta label="Date">{fmtDate(inv.issue_date)}</Meta>
        <Meta label="Due">{fmtDate(inv.due_date)}</Meta>
        <Meta label="Paid or credited">{fmt(inv.amount_paid)}</Meta>
        <Meta label={`Balance (${inv.currency})`}>{fmt(inv.balance_due)}</Meta>
        {inv.reference && <Meta label="Customer's reference">{inv.reference}</Meta>}
        <TagsMeta doc={inv} />
        {inv.status !== "draft" && <EtimsMeta status={inv.etims_status} cu={inv.etims_cu_invoice_number} />}
        {inv.void_reason && <Meta label="Void because">{inv.void_reason}</Meta>}
      </Card>
      <DocumentLines lines={inv.lines ?? []} subtotal={inv.subtotal} tax={inv.tax_total} total={inv.total} currency={inv.currency ?? ""} />
      {(inv.payments as unknown as AppliedRow[]).length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold">Payments and credits</h2>
          <Card>
            <Table head={["Date", "Document", "Amount"]}>
              {(inv.payments as unknown as AppliedRow[]).map((p) => (
                <tr key={p.id}>
                  <Td>{fmtDate(p.date)}</Td>
                  <Td><Link href={`/w/${slug}/sales/${p.kind === "payment" ? "payments" : "credit-notes"}/${p.id}`} className="hover:underline">{p.kind === "payment" ? "Payment" : "Credit note"} <span className="font-mono text-xs">{p.number}</span></Link></Td>
                  <Td className="text-right font-mono">{fmt(p.amount)}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      )}
      {inv.notes && <p className="mt-4 whitespace-pre-line text-sm text-stone-600">{inv.notes}</p>}

      <Modal open={paying} title={`Payment for ${inv.number}`} onClose={() => setPaying(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); recordPayment.mutate(); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount received" error={fieldError(recordPayment.error, "amount")} hint={`Balance ${fmt(inv.balance_due)}. Any extra stays as the customer's credit.`}>
              <Input required inputMode="decimal" value={pay.amount} onChange={(e) => setPay((prev) => ({ ...prev, amount: e.target.value }))} />
            </Field>
            <Field label="Date"><Input type="date" required value={pay.payment_date} onChange={(e) => setPay((prev) => ({ ...prev, payment_date: e.target.value }))} /></Field>
            <Field label="Method"><Select value={pay.method} onChange={(e) => setPay((prev) => ({ ...prev, method: e.target.value }))}>{METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
            <Field label={pay.method === "mpesa" ? "M-Pesa code" : "Reference"}><Input required={pay.method === "mpesa"} value={pay.reference} onChange={(e) => setPay((prev) => ({ ...prev, reference: e.target.value }))} /></Field>
          </div>
          <Field label="Received into" error={fieldError(recordPayment.error, "deposit_account_id")}>
            <Select required value={pay.deposit_account_id} onChange={(e) => setPay((prev) => ({ ...prev, deposit_account_id: e.target.value }))}>
              {deposits.data.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
            </Select>
          </Field>
          <FormError error={recordPayment.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setPaying(false)}>Cancel</Button><Button type="submit" loading={recordPayment.isPending}>Record payment</Button></div>
        </form>
      </Modal>
      <MpesaPromptModal open={prompting} onClose={() => setPrompting(false)} amount={String(Math.floor(Number(inv.balance_due)))} invoiceId={inv.id} reference={inv.number} />
      <ShareLinkModal open={sharing} onClose={() => setSharing(false)} customerId={inv.customer_id!} invoiceId={inv.id} label={`${label} ${inv.number}`} />
      <Modal open={voiding} title={`Void ${inv.number}`} onClose={() => setVoiding(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); voidIt.mutate(); }}>
          <p className="text-sm text-stone-600">Voiding cancels the invoice and removes it from the books. Its number stays used. To reduce what the customer owes instead, raise a credit note.</p>
          <Field label="Reason" error={fieldError(voidIt.error, "reason")}><Input required value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <FormError error={voidIt.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setVoiding(false)}>Cancel</Button><Button type="submit" variant="danger" loading={voidIt.isPending}>Void invoice</Button></div>
        </form>
      </Modal>
    </div>
  );
}
