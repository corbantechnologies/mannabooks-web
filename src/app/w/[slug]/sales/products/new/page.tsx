"use client";

import { useRouter } from "next/navigation";

import { ProductForm } from "@/components/product-form";
import { AsPage } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";

export default function NewProductPage() {
  const { slug } = useWorkspace();
  const router = useRouter();
  return <AsPage guide="products"><ProductForm onDone={() => router.push(`/w/${slug}/sales/products`)} /></AsPage>;
}
