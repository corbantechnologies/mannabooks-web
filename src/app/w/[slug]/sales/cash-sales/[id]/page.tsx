"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { SendEmailButton } from "@/components/send-email";
import { DocumentLines, EtimsMeta, Meta } from "@/components/document-view";
import { Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Spinner } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { METHODS } from "@/lib/api/sales";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function CashSalePage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const path = { params: { path: { workspace: slug, id } } };
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const receipt = useQuery({ queryKey: ["receipt", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/receipts/{id}/", path)) });
  const voidIt = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/receipts/{id}/void/", { ...path, body: { reason } })),
    onSuccess: () => { toast.success("Cash sale voided"); setVoiding(false); },
  });
  if (receipt.isLoading) return <Spinner />;
  if (receipt.error) return <ErrorState error={receipt.error} />;
  const r = receipt.data!;
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/sales/cash-sales`} className="text-sm text-stone-500 hover:underline">&larr; Cash sales</Link>
      <PageHeader
        title={`Cash sale ${r.number}`}
        description={r.customer_name || "Walk-in customer"}
        guide="cash-sales"
        actions={
          <div className="flex flex-wrap gap-2">
            {r.status === "issued" && can("receipts.create") && <SendEmailButton docType="cash_sale" id={r.id} />}
            <Link href={`/w/${slug}/sales/cash-sales/${r.id}/print`}><Button variant="secondary"><Printer className="h-4 w-4" /> Print</Button></Link>
            {r.status === "issued" && can("receipts.void") && <Button variant="secondary" onClick={() => { voidIt.reset(); setVoiding(true); }}>Void</Button>}
          </div>
        }
      />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-4">
        <Meta label="Date">{fmtDate(r.issue_date)}</Meta>
        <Meta label="Paid by">{METHODS.find((m) => m.value === r.method)?.label} {r.payment_reference && <span className="font-mono text-xs">{r.payment_reference}</span>}</Meta>
        <Meta label="Received into">{r.deposit_account_name}</Meta>
        <EtimsMeta status={r.etims_status} cu={r.etims_cu_invoice_number} />
        {r.status === "void" && <Meta label="Void because">{r.void_reason}</Meta>}
      </Card>
      <DocumentLines lines={r.lines} subtotal={r.subtotal} tax={r.tax_total} total={r.total} currency={r.currency ?? ""} />
      <Modal open={voiding} title={`Void ${r.number}`} onClose={() => setVoiding(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); voidIt.mutate(); }}>
          <p className="text-sm text-stone-600">Voiding removes the sale and the money received from the books. Use it for a sale keyed by mistake.</p>
          <Field label="Reason" error={fieldError(voidIt.error, "reason")}><Input required value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <FormError error={voidIt.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setVoiding(false)}>Cancel</Button><Button type="submit" variant="danger" loading={voidIt.isPending}>Void cash sale</Button></div>
        </form>
      </Modal>
    </div>
  );
}
