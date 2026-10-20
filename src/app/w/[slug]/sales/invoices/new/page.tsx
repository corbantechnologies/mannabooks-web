"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { SalesDocForm } from "@/components/sales-doc-form";
import { PageHeader } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";

function NewInvoice() {
  const { slug } = useWorkspace();
  const params = useSearchParams();
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/sales/invoices`} className="text-sm text-stone-500 hover:underline">&larr; Invoices</Link>
      <PageHeader title="New invoice" description="Save a draft to finish later, or issue it now." guide="invoices" />
      <SalesDocForm kind="invoice" initialCustomer={params.get("customer") ?? undefined} />
    </div>
  );
}

export default function NewInvoicePage() {
  return <Suspense><NewInvoice /></Suspense>;
}
