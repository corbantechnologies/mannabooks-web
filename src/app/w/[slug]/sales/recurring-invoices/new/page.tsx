"use client";

import Link from "next/link";

import { RecurringForm } from "@/components/recurring-form";
import { PageHeader } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";

export default function NewRecurringInvoicePage() {
  const { slug } = useWorkspace();
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/sales/recurring-invoices`} className="text-sm text-stone-500 hover:underline">&larr; Recurring invoices</Link>
      <PageHeader title="New recurring invoice" description="Set the customer, the lines and how often to invoice." guide="recurring-invoices" />
      <RecurringForm />
    </div>
  );
}
