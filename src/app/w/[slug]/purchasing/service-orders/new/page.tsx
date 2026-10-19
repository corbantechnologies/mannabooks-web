"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { PurchaseDocForm } from "@/components/purchase-doc-form";
import { PageHeader } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";

function NewServiceOrder() {
  const { slug } = useWorkspace();
  return (
    <div className="max-w-6xl">
      <Link href={`/w/${slug}/purchasing/service-orders`} className="text-sm text-stone-500 hover:underline">&larr; Service orders</Link>
      <PageHeader title="New service order" description="Describe the work and agree the price. It is approved before the supplier starts." guide="service-orders" />
      <PurchaseDocForm kind="service" supplierId={useSearchParams().get("supplier") ?? undefined} />
    </div>
  );
}

export default function NewServiceOrderPage() {
  return <Suspense><NewServiceOrder /></Suspense>;
}
