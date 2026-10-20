"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { SalesDocForm } from "@/components/sales-doc-form";
import { PageHeader } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";

function NewQuotation() {
  const { slug } = useWorkspace();
  const params = useSearchParams();
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/sales/quotations`} className="text-sm text-stone-500 hover:underline">&larr; Quotations</Link>
      <PageHeader title="New quotation" guide="quotations" />
      <SalesDocForm kind="quotation" initialCustomer={params.get("customer") ?? undefined} />
    </div>
  );
}

export default function NewQuotationPage() {
  return <Suspense><NewQuotation /></Suspense>;
}
