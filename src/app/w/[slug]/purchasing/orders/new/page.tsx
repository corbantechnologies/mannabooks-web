"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { PurchaseDocForm } from "@/components/purchase-doc-form";
import { PageHeader } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";

function NewOrder() {
  const { slug } = useWorkspace();
  const supplier = useSearchParams().get("supplier") ?? undefined;
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/purchasing/orders`} className="text-sm text-stone-500 hover:underline">&larr; Purchase orders</Link>
      <PageHeader title="New purchase order" description="Saved as a draft. Someone allowed to approve orders approves it before it is sent." guide="purchase-orders" />
      <PurchaseDocForm kind="order" supplierId={supplier} />
    </div>
  );
}

export default function NewOrderPage() {
  return <Suspense><NewOrder /></Suspense>;
}
