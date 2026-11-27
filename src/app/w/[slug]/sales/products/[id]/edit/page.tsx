"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";

import { ProductForm } from "@/components/product-form";
import { AsPage, ErrorState, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace } from "@/lib/workspace";

export default function EditProductPage() {
  const { slug } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const q = useQuery({ queryKey: ["product", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/products/{id}/", { params: { path: { workspace: slug, id } } })) });
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} />;
  return <AsPage guide="products"><ProductForm key={q.data.id} product={q.data} onDone={() => router.push(`/w/${slug}/sales/products`)} /></AsPage>;
}
