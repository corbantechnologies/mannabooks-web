"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Meta } from "@/components/document-view";
import { TagsMeta } from "@/components/tag-pickers";
import { PurchaseLinesView } from "@/components/purchase-lines";
import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function ExpensePage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const path = { params: { path: { workspace: slug, id } } };
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const x = useQuery({ queryKey: ["expense", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/expenses/{id}/", path)) });
  const voidIt = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/expenses/{id}/void/", { ...path, body: { reason } })),
    onSuccess: () => { toast.success("Expense voided"); setVoiding(false); },
  });
  if (x.isLoading) return <Spinner />;
  if (x.error) return <ErrorState error={x.error} />;
  const e = x.data!;
  return (
    <div className="max-w-5xl">
      <Link href={`/w/${slug}/banking/expenses`} className="text-sm text-stone-500 hover:underline">&larr; Expenses</Link>
      <PageHeader title={`Expense ${e.number}`} description={e.payee || e.supplier_name || ""} guide="expenses"
        actions={e.status === "posted" && can("banking.spend") && <Button variant="secondary" onClick={() => { voidIt.reset(); setVoiding(true); }}>Void</Button>} />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-4">
        <Meta label="Date">{fmtDate(e.expense_date)}</Meta>
        <Meta label="Paid from">{e.paid_from_name}</Meta>
        <Meta label="Reference">{e.reference || "-"}</Meta>
        <Meta label="Status">{e.status === "void" ? <Badge>Void: {e.void_reason}</Badge> : <Badge tone="green">Posted</Badge>}</Meta>
        {e.supplier_etims_number && <Meta label="eTIMS CU no.">{e.supplier_etims_number}</Meta>}
        <TagsMeta doc={e} />
      </Card>
      <PurchaseLinesView lines={e.lines} subtotal={e.subtotal} tax={e.tax_total} total={e.total} />
      <Modal open={voiding} title={`Void ${e.number}`} onClose={() => setVoiding(false)}>
        <form className="space-y-4" onSubmit={(ev) => { ev.preventDefault(); voidIt.mutate(); }}>
          <Field label="Reason"><Input required value={reason} onChange={(ev) => setReason(ev.target.value)} /></Field>
          <FormError error={voidIt.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setVoiding(false)}>Cancel</Button><Button type="submit" variant="danger" loading={voidIt.isPending}>Void</Button></div>
        </form>
      </Modal>
    </div>
  );
}
