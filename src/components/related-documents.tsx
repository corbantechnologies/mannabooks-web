"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export type RelatedKind = "quotation" | "invoice" | "credit_note" | "delivery_note" | "payment" | "purchase_order" | "service_order"
  | "goods_receipt" | "bill" | "payment_voucher" | "supplier_payment";

/** The chain this document belongs to, in the order of the process: where it came from and what followed. Hidden when it stands alone. */
export function RelatedDocuments({ kind, id }: { kind: RelatedKind; id: string }) {
  const { slug } = useWorkspace();
  const related = useQuery({
    queryKey: ["related-documents", slug, kind, id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/related-documents/", { params: { path: { workspace: slug }, query: { kind, id } } })),
  });
  const rows = related.data ?? [];
  if (rows.length < 2) return null;
  return (
    <section className="mb-4 rounded-lg border border-stone-200 bg-white p-3 shadow-sm print:hidden" aria-label="Related documents">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">Related documents</p>
      <ol className="flex flex-wrap items-stretch gap-1.5">
        {rows.map((r, i) => (
          <li key={`${r.kind}-${r.id}`} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" aria-hidden />}
            <Link href={`/w/${slug}${r.path}`} aria-current={r.current ? "page" : undefined}
              className={clsx("block rounded-md border px-2.5 py-1.5 text-xs leading-tight",
                r.current ? "border-brand-300 bg-brand-50" : "border-stone-200 hover:border-brand-300 hover:bg-stone-50")}>
              <span className="block text-stone-500">{r.label}{r.status_label ? ` · ${r.status_label}` : ""}</span>
              <span className="block font-mono font-medium text-stone-900">{r.number}</span>
              <span className="block text-stone-500">{fmtDate(r.date)}{r.amount !== null ? ` · ${fmt(r.amount)}` : ""}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
