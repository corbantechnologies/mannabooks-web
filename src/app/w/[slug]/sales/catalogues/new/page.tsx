"use client";

import Link from "next/link";

import { CatalogueForm } from "@/components/catalogue-form";
import { PageHeader } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";

export default function NewCataloguePage() {
  const { slug } = useWorkspace();
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/sales/catalogues`} className="text-sm text-stone-500 hover:underline">&larr; Catalogues</Link>
      <PageHeader title="New catalogue" guide="catalogues" description="Choose the products to send. The client picks from them and gets a quotation." />
      <CatalogueForm />
    </div>
  );
}
