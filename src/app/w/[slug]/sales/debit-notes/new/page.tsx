"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { SalesDocForm } from "@/components/sales-doc-form";
import { Card, Field, PageHeader, Select, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useOpenInvoices } from "@/lib/api/sales";
import { fmt } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

function NewDebitNote() {
  const { slug } = useWorkspace();
  const router = useRouter();
  const invoiceId = useSearchParams().get("invoice");
  const invoices = useOpenInvoices(slug);
  const invoice = useQuery({
    queryKey: ["invoice", slug, invoiceId],
    enabled: Boolean(invoiceId),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/invoices/{id}/", { params: { path: { workspace: slug, id: invoiceId! } } })),
  });
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/sales/debit-notes`} className="text-sm text-stone-500 hover:underline">&larr; Debit notes</Link>
      <PageHeader title="New debit note" description="It is saved as a draft; issuing it adds to what the customer owes and sends it to KRA eTIMS when signing is on." guide="debit-notes" />
      <Card className="mb-4 p-4">
        <Field label="Adds to invoice">
          <Select value={invoiceId ?? ""} onChange={(e) => router.replace(`/w/${slug}/sales/debit-notes/new?invoice=${e.target.value}`)}>
            <option value="">Choose the invoice</option>
            {(invoices.data?.results ?? []).map((i) => <option key={i.id} value={i.id}>{i.number} · {i.customer_name} · {fmt(i.total)}</option>)}
          </Select>
        </Field>
      </Card>
      {invoiceId && (invoice.isLoading ? <Spinner /> : invoice.data && <SalesDocForm key={invoiceId} kind="debit_note" original={invoice.data} />)}
    </div>
  );
}

export default function NewDebitNotePage() {
  return <Suspense><NewDebitNote /></Suspense>;
}
