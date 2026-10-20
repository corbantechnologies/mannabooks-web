"use client";

import Link from "next/link";

import { AssetForm } from "@/components/asset-form";
import { PageHeader } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";

export default function NewAssetPage() {
  const { slug } = useWorkspace();
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/accounting/fixed-assets`} className="text-sm text-stone-500 hover:underline">&larr; Fixed assets</Link>
      <PageHeader title="Add a fixed asset" guide="fixed-assets" description="The usual method and life for the category are filled in; change them if your accountant uses different ones." />
      <AssetForm />
    </div>
  );
}
