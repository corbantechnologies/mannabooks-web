"use client";

import Link from "next/link";

import { JournalForm } from "@/components/journal-form";
import { PageHeader } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";

export default function NewJournalPage() {
  const { slug } = useWorkspace();
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/accounting/journals`} className="text-sm text-stone-500 hover:underline">&larr; Journal entries</Link>
      <PageHeader title="New journal entry" description="Debits must equal credits. Save a draft to finish later, or post it now." guide="journal-entries" />
      <JournalForm />
    </div>
  );
}
