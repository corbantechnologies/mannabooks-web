"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button, FormError } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace, wsPath } from "@/lib/workspace";

const PATH = { invoice: "/sales/invoices/", bill: "/purchasing/bills/" } as const;

/**
 * On an invoice or bill: "Replaces INV-0006" / "Replaced by INV-0009", and on a voided one a
 * "Copy as a new draft" button. A void is never undone; the copy gets a new number when issued.
 */
export function VoidLinks({ kind, id, voided }: { kind: "invoice" | "bill"; id: string; voided: boolean }) {
  const { slug, can } = useWorkspace();
  const router = useRouter();
  const links = useQuery({
    queryKey: ["void-links", slug, kind, id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/voided/links/", { params: { path: { workspace: slug }, query: { kind, id } } })),
  });
  const copy = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/voided/copy/", { ...wsPath(slug), body: { kind, id } })),
    onSuccess: (res) => router.push(`/w/${slug}${res.link}`),
  });
  const l = links.data;
  const mayCopy = voided && !l?.replaced_by && can(kind === "invoice" ? "invoices.create" : "bills.create");
  if (!l?.replaces && !l?.replaced_by && !mayCopy) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm">
      {l?.replaces && (
        <span>Replaces the voided <Link className="font-mono text-brand-700 hover:underline" href={`/w/${slug}${PATH[kind]}${l.replaces.id}`}>{l.replaces.number}</Link></span>
      )}
      {l?.replaced_by && (
        <span>Replaced by <Link className="font-mono text-brand-700 hover:underline" href={`/w/${slug}${PATH[kind]}${l.replaced_by.id}`}>{l.replaced_by.number}</Link></span>
      )}
      {mayCopy && (
        <>
          <span className="text-stone-600">Voided documents are never brought back. Need it again?</span>
          <Button variant="secondary" loading={copy.isPending} onClick={() => copy.mutate()}><Copy className="h-4 w-4" /> Copy as a new draft</Button>
        </>
      )}
      <FormError error={copy.error} />
    </div>
  );
}
