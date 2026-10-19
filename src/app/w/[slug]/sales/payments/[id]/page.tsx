"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Meta } from "@/components/document-view";
import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { METHODS } from "@/lib/api/sales";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function PaymentPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const path = { params: { path: { workspace: slug, id } } };
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const payment = useQuery({ queryKey: ["payment", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/payments/{id}/", path)) });
  const voidIt = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/payments/{id}/void/", { ...path, body: { reason } })),
    onSuccess: () => { toast.success("Payment voided"); setVoiding(false); },
  });
  if (payment.isLoading) return <Spinner />;
  if (payment.error) return <ErrorState error={payment.error} />;
  const p = payment.data!;
  return (
    <div className="max-w-4xl">
      <Link href={`/w/${slug}/sales/payments`} className="text-sm text-stone-500 hover:underline">&larr; Payments</Link>
      <PageHeader
        title={`Payment ${p.number}`}
        description={p.customer_name}
        guide="payments"
        actions={p.status === "posted" && can("payments.void") && <Button variant="secondary" onClick={() => { voidIt.reset(); setVoiding(true); }}>Void</Button>}
      />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-4">
        <Meta label="Amount">{fmt(p.amount)}</Meta>
        <Meta label="Date">{fmtDate(p.payment_date)}</Meta>
        <Meta label="Method">{METHODS.find((m) => m.value === p.method)?.label} {p.reference && <span className="font-mono text-xs">{p.reference}</span>}</Meta>
        <Meta label="Received into">{p.deposit_account_name}</Meta>
        <Meta label="Kept as credit">{fmt(p.unallocated_amount)}</Meta>
        <Meta label="Status">{p.status === "void" ? <Badge>Void: {p.void_reason}</Badge> : <Badge tone="green">Posted</Badge>}</Meta>
      </Card>
      <h2 className="mb-2 text-sm font-semibold">Applied to</h2>
      <Card>
        <Table head={["Invoice", "Amount"]}>
          {(p.allocations ?? []).map((a) => (
            <tr key={a.invoice_id}><Td><Link href={`/w/${slug}/sales/invoices/${a.invoice_id}`} className="font-mono text-xs hover:underline">{a.invoice_number}</Link></Td><Td className="text-right font-mono">{fmt(a.amount)}</Td></tr>
          ))}
          {(p.allocations ?? []).length === 0 && <tr><Td colSpan={2} className="text-stone-500">Not applied to any invoice.</Td></tr>}
        </Table>
      </Card>
      <Modal open={voiding} title={`Void ${p.number}`} onClose={() => setVoiding(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); voidIt.mutate(); }}>
          <p className="text-sm text-stone-600">Use this for a bounced cheque or a payment recorded by mistake. The invoices it paid become unpaid again.</p>
          <Field label="Reason" error={fieldError(voidIt.error, "reason")}><Input required value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <FormError error={voidIt.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setVoiding(false)}>Cancel</Button><Button type="submit" variant="danger" loading={voidIt.isPending}>Void payment</Button></div>
        </form>
      </Modal>
    </div>
  );
}
