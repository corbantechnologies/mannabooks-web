"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

const KINDS = [
  ["", "Every kind"], ["invoice", "Invoices"], ["credit_note", "Credit notes"], ["cash_sale", "Cash sales"], ["payment", "Payments received"],
  ["bill", "Bills"], ["supplier_payment", "Supplier payments"], ["expense", "Expenses"], ["other_income", "Other income"], ["bank_transfer", "Bank transfers"],
];

/** Every cancelled document in one place. A void is never undone: copy it as a new draft instead. */
export default function VoidedPage() {
  const { slug, can } = useWorkspace();
  const router = useRouter();
  const params = useSearchParams();
  const [kind, setKind] = useState(params.get("kind") ?? "");
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");
  const list = useQuery({
    queryKey: ["voided", slug, kind, from, to],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/voided/", { params: { path: { workspace: slug }, query: { kind: kind || undefined, from: from || undefined, to: to || undefined } } })),
  });
  const copy = useMutation({
    mutationFn: async (r: { kind: string; id: string }) =>
      unwrap(await api.POST("/api/v1/w/{workspace}/voided/copy/", { ...wsPath(slug), body: { kind: r.kind as "invoice", id: r.id } })),
    onSuccess: (res) => router.push(`/w/${slug}${res.link}`),
  });
  const rows = list.data ?? [];
  const mayCopy = (k: string) => (k === "invoice" ? can("invoices.create") : k === "bill" ? can("bills.create") : false);
  return (
    <div className="w-full">
      <PageHeader title="Voided documents" guide="voided-documents"
        description="Everything that was cancelled: who voided it, when and why, and what happened in the books. A void is never undone, so the numbers and the audit trail stay clean. Need it again? Copy it as a new draft." />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Field label="Kind"><Select value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        <Field label="Dated from"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="Dated to"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      <FormError error={copy.error} />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="Nothing voided">Nothing matches these filters.</EmptyState>
        ) : (
          <Table head={["Document", "Party", "Amount", "Why", "Voided", "Books", ""]}>
            {rows.map((r) => (
              <tr key={`${r.kind}-${r.id}`} className="hover:bg-stone-50">
                <Td>
                  <Link href={`/w/${slug}${r.link}`} className="font-mono text-xs text-brand-700 hover:underline">{r.number || "No number"}</Link>
                  <span className="block text-xs text-stone-500">{r.kind_label} · {fmtDate(r.date)}</span>
                </Td>
                <Td>{r.party || "-"}</Td>
                <Td className="text-right font-mono">{fmt(r.amount)}</Td>
                <Td className="max-w-xs text-sm text-stone-600">{r.reason || "-"}</Td>
                <Td className="text-sm">{r.voided_by || "-"}<span className="block text-xs text-stone-500">{fmtDate(r.voided_at)}</span></Td>
                <Td>
                  <Badge tone={r.books === "reversed" ? "amber" : "stone"}>{r.books === "reversed" ? "Reversed" : "Removed"}</Badge>
                </Td>
                <Td className="text-right">
                  {r.replaced_by ? (
                    <Link href={`/w/${slug}${r.link.replace(r.id, r.replaced_by)}`} className="text-sm text-brand-700 hover:underline">Open its replacement</Link>
                  ) : r.can_copy && mayCopy(r.kind) ? (
                    <Button variant="secondary" loading={copy.isPending && copy.variables?.id === r.id} onClick={() => copy.mutate({ kind: r.kind, id: r.id })}>
                      <Copy className="h-4 w-4" /> Copy as new draft
                    </Button>
                  ) : null}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <p className="mt-3 text-xs text-stone-500">Removed: its month was open, so its entries were taken out. Reversed: its month was closed, so a reversing entry was posted and the closed month did not change.</p>
    </div>
  );
}
