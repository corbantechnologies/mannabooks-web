"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { RecipeForm } from "@/components/recipe-form";
import { Button, ErrorState, PageHeader, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace } from "@/lib/workspace";

export default function RecipePage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const bom = useQuery({ queryKey: ["bom", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/bills-of-materials/{id}/", { params: { path: { workspace: slug, id } } })) });
  if (bom.isLoading) return <Spinner />;
  if (bom.error) return <ErrorState error={bom.error} />;
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/manufacturing/recipes`} className="text-sm text-stone-500 hover:underline">&larr; Recipes</Link>
      <PageHeader title={bom.data!.product_name} description="Recipe" guide="manufacturing"
        actions={can("manufacturing.manage") && <Link href={`/w/${slug}/manufacturing/production/new?recipe=${id}`}><Button>Make some</Button></Link>} />
      <RecipeForm existing={bom.data!} />
    </div>
  );
}
