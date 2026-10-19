"use client";

import Link from "next/link";

import { RecipeForm } from "@/components/recipe-form";
import { PageHeader } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";

export default function NewRecipePage() {
  const { slug } = useWorkspace();
  return (
    <div className="max-w-4xl">
      <Link href={`/w/${slug}/manufacturing/recipes`} className="text-sm text-stone-500 hover:underline">&larr; Recipes</Link>
      <PageHeader title="New recipe" description="The finished product and its components must all track stock." guide="manufacturing" />
      <RecipeForm />
    </div>
  );
}
