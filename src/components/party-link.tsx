"use client";

import Link from "next/link";

import { useWorkspace } from "@/lib/workspace";

/** A customer's or supplier's name on a document, linking to their profile, so you can go from the document to them. */
export function PartyLink({ kind, id, name, fallback = "" }: { kind: "customer" | "supplier"; id?: string | null; name?: string | null; fallback?: string }) {
  const { slug } = useWorkspace();
  if (!name) return <>{fallback}</>;
  if (!id) return <>{name}</>;
  return <Link href={`/w/${slug}/${kind === "customer" ? "sales/customers" : "purchasing/suppliers"}/${id}`} className="text-brand-700 hover:underline">{name}</Link>;
}
