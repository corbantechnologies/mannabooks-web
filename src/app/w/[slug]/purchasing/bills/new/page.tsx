"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import toast from "react-hot-toast";

import { PurchaseDocForm } from "@/components/purchase-doc-form";
import { Button, Card, Field, FormError, Input, PageHeader } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

/** A bill copied from goods received, an order or a service order: just the supplier's invoice details are needed. */
function FromSource({ source }: { source: { goods_receipt_id?: string; purchase_order_id?: string; service_order_id?: string } }) {
  const { slug } = useWorkspace();
  const router = useRouter();
  const [head, setHead] = useState({ supplier_invoice_number: "", supplier_etims_number: "", bill_date: todayIso() });
  const create = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/bills/", { ...wsPath(slug), body: { ...head, ...source } as never })),
    onSuccess: (b) => { toast.success("Draft bill made: check it and post it"); router.push(`/w/${slug}/purchasing/bills/${b.id}`); },
  });
  return (
    <Card className="p-5">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
        <p className="text-sm text-stone-600">The lines are copied for you. Enter the supplier&apos;s invoice details, then check the bill against their invoice.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Their invoice number" error={fieldError(create.error, "supplier_invoice_number")}><Input required value={head.supplier_invoice_number} onChange={(e) => setHead((p) => ({ ...p, supplier_invoice_number: e.target.value }))} /></Field>
          <Field label="Their eTIMS CU invoice no."><Input value={head.supplier_etims_number} onChange={(e) => setHead((p) => ({ ...p, supplier_etims_number: e.target.value }))} /></Field>
          <Field label="Bill date"><Input type="date" required value={head.bill_date} onChange={(e) => setHead((p) => ({ ...p, bill_date: e.target.value }))} /></Field>
        </div>
        <FormError error={create.error} />
        <Button type="submit" loading={create.isPending}>Make the bill</Button>
      </form>
    </Card>
  );
}

function NewBill() {
  const { slug } = useWorkspace();
  const q = useSearchParams();
  const source = q.get("receipt") ? { goods_receipt_id: q.get("receipt")! } : q.get("order") ? { purchase_order_id: q.get("order")! }
    : q.get("service") ? { service_order_id: q.get("service")! } : null;
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/purchasing/bills`} className="text-sm text-stone-500 hover:underline">&larr; Bills</Link>
      <PageHeader title="Enter a supplier bill" description="Copy the supplier's invoice. Stock items go to Inventory; everything else to the account you choose." guide="bills" />
      {source ? <FromSource source={source} /> : <PurchaseDocForm kind="bill" supplierId={q.get("supplier") ?? undefined} />}
    </div>
  );
}

export default function NewBillPage() {
  return <Suspense><NewBill /></Suspense>;
}
