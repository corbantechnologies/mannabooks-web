"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Meta } from "@/components/document-view";
import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { PAY_METHODS } from "@/lib/api/purchasing";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function SupplierPaymentPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const path = { params: { path: { workspace: slug, id } } };
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const payment = useQuery({ queryKey: ["supplier-payment", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/supplier-payments/{id}/", path)) });
  const voidIt = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/supplier-payments/{id}/void/", { ...path, body: { reason } })),
    onSuccess: () => { toast.success("Payment voided"); setVoiding(false); },
  });
  if (payment.isLoading) return <Spinner />;
  if (payment.error) return <ErrorState error={payment.error} />;
  const p = payment.data!;
  return (
    <div className="max-w-4xl">
      <Link href={`/w/${slug}/purchasing/payments`} className="text-sm text-stone-500 hover:underline">&larr; Supplier payments</Link>
      <PageHeader title={`Payment ${p.number}`} description={p.supplier_name} guide="supplier-payments"
        actions={p.status === "posted" && can("supplierpayments.void") && <Button variant="secondary" onClick={() => { voidIt.reset(); setVoiding(true); }}>Void</Button>} />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-4">
        <Meta label="Paid">{fmt(p.amount)}</Meta>
        <Meta label="Withholding tax">{fmt(p.withholding_amount)}</Meta>
        <Meta label="Date">{fmtDate(p.payment_date)}</Meta>
        <Meta label="Method">{PAY_METHODS.find((m) => m.value === p.method)?.label} {p.reference && <span className="font-mono text-xs">{p.reference}</span>}</Meta>
        <Meta label="From">{p.paid_from_name}</Meta>
        <Meta label="Not applied">{fmt(p.unallocated_amount)}</Meta>
        <Meta label="Status">{p.status === "void" ? <Badge>Void: {p.void_reason}</Badge> : <Badge tone="green">Posted</Badge>}</Meta>
      </Card>
      <Card>
        <Table head={["Bill", "Amount"]}>
          {(p.allocations ?? []).map((a) => <tr key={a.bill_id}><Td><Link className="font-mono text-xs hover:underline" href={`/w/${slug}/purchasing/bills/${a.bill_id}`}>{a.bill_number}</Link></Td><Td className="text-right font-mono">{fmt(a.amount)}</Td></tr>)}
        </Table>
      </Card>
      <Modal open={voiding} title={`Void ${p.number}`} onClose={() => setVoiding(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); voidIt.mutate(); }}>
          <p className="text-sm text-stone-600">The bills it paid become unpaid again, and its voucher goes back to approved.</p>
          <Field label="Reason"><Input required value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <FormError error={voidIt.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setVoiding(false)}>Cancel</Button><Button type="submit" variant="danger" loading={voidIt.isPending}>Void payment</Button></div>
        </form>
      </Modal>
    </div>
  );
}
