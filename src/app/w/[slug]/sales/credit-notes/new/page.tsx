"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import toast from "react-hot-toast";

import { EditLine, LinesEditor, blankLine, linesFromDocument, linesToRequest } from "@/components/lines-editor";
import { Button, Card, Field, FormError, Input, PageHeader, Select, Spinner } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { useCustomers } from "@/lib/api/sales";
import type { Invoice } from "@/lib/api/types";
import { fmt, todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

function CreditNoteForm({ invoice }: { invoice?: Invoice }) {
  const { slug, context } = useWorkspace();
  const router = useRouter();
  const customers = useCustomers(slug);
  const [head, setHead] = useState({ customer_id: invoice?.customer_id ?? "", issue_date: todayIso(), reason: "" });
  const settled = invoice ? Number(invoice.total) - Number(invoice.balance_due) : 0;  // already paid or credited
  const [whole, setWhole] = useState(settled === 0);
  const [restock, setRestock] = useState(true);
  const [includeTax, setIncludeTax] = useState(invoice?.prices_include_tax ?? false);
  const [lines, setLinesState] = useState<EditLine[]>(invoice?.lines?.length ? linesFromDocument(invoice.lines) : [blankLine()]);
  const setLines = (update: (prev: EditLine[]) => EditLine[]) => setLinesState(update);
  const creditingWhole = Boolean(invoice) && whole;

  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/credit-notes/", {
      ...wsPath(slug),
      body: {
        customer_id: head.customer_id, issue_date: head.issue_date, reason: head.reason, invoice_id: invoice?.id ?? null, return_stock: restock,
        prices_include_tax: includeTax, ...(creditingWhole ? {} : { lines: linesToRequest(lines) }),
      },
    })),
    onSuccess: (c) => { toast.success(`Credit note ${c.number} issued`); router.push(`/w/${slug}/sales/credit-notes/${c.id}`); },
  });

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <Card className="grid gap-3 p-4 sm:grid-cols-4">
        {invoice ? (
          <div className="sm:col-span-2 text-sm"><p className="text-stone-500">Crediting invoice</p><p className="font-medium">{invoice.number} · {invoice.customer_name} · balance {fmt(invoice.balance_due)}</p>
            {Number(invoice.balance_due) <= 0 && <p className="mt-1 text-xs text-amber-800">This invoice is fully paid, so the credit stays on {invoice.customer_name}&apos;s account: it comes off their next invoice, or you refund it.</p>}</div>
        ) : (
          <div className="sm:col-span-2">
            <Field label="Customer" error={fieldError(save.error, "customer_id")}>
              <Select required value={head.customer_id} onChange={(e) => setHead((prev) => ({ ...prev, customer_id: e.target.value }))}>
                <option value="">Choose a customer</option>
                {(customers.data?.results ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </div>
        )}
        <Field label="Date"><Input type="date" required value={head.issue_date} onChange={(e) => setHead((prev) => ({ ...prev, issue_date: e.target.value }))} /></Field>
        <Field label="Reason" error={fieldError(save.error, "reason")}><Input required value={head.reason} onChange={(e) => setHead((prev) => ({ ...prev, reason: e.target.value }))} placeholder="Goods returned" /></Field>
      </Card>
      {invoice && (
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="radio" checked={whole} onChange={() => setWhole(true)} /> Credit the whole invoice ({fmt(invoice.total)})</label>
          <label className="flex items-center gap-2"><input type="radio" checked={!whole} onChange={() => setWhole(false)} /> Credit part of it</label>
        </div>
      )}
      {invoice && whole && settled > 0 && (
        <p className="text-sm text-amber-700">{fmt(settled)} of this invoice is already paid or credited. Only {fmt(invoice.balance_due)} is applied to it; the rest is kept as the customer&apos;s credit.</p>
      )}
      {!creditingWhole && <LinesEditor slug={slug} lines={lines} setLines={setLines} includeTax={includeTax} setIncludeTax={setIncludeTax} currency={context.workspace.currency ?? "KES"} />}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Goods came back: put stock items back into stock</label>
      <FormError error={save.error} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" loading={save.isPending}>Issue credit note</Button>
      </div>
    </form>
  );
}

function NewCreditNote() {
  const { slug } = useWorkspace();
  const invoiceId = useSearchParams().get("invoice");
  const invoice = useQuery({
    queryKey: ["invoice", slug, invoiceId],
    enabled: Boolean(invoiceId),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/invoices/{id}/", { params: { path: { workspace: slug, id: invoiceId! } } })),
  });
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/sales/credit-notes`} className="text-sm text-stone-500 hover:underline">&larr; Credit notes</Link>
      <PageHeader title="New credit note" description="Issuing it posts it at once and reduces what the customer owes." guide="credit-notes" />
      {invoiceId && invoice.isLoading ? <Spinner /> : <CreditNoteForm invoice={invoice.data} />}
    </div>
  );
}

export default function NewCreditNotePage() {
  return <Suspense><NewCreditNote /></Suspense>;
}
