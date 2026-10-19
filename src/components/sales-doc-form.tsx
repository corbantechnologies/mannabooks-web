"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { api, fieldError, unwrap } from "@/lib/api/client";
import { useCustomers } from "@/lib/api/sales";
import type { Invoice, Quotation } from "@/lib/api/types";
import { todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

import { EditLine, LinesEditor, blankLine, linesFromDocument, linesToRequest, useDefaultVat } from "./lines-editor";
import { TagPickers, tagsBody, tagsOf } from "./tag-pickers";
import { Button, Card, Field, FormError, Input, Select, Textarea } from "./ui";

type Kind = "invoice" | "quotation" | "debit_note";

/** Create or edit a draft invoice, debit note or quotation. A debit note adds to `original` (an issued invoice). */
export function SalesDocForm({ kind, existing, initialCustomer, original }: { kind: Kind; existing?: Invoice | Quotation; initialCustomer?: string; original?: Invoice }) {
  const billing = kind !== "quotation";
  const { slug, context } = useWorkspace();
  const router = useRouter();
  const customers = useCustomers(slug);
  const defaultVat = useDefaultVat(slug);
  const inv = existing as Invoice | undefined;
  const quote = existing as Quotation | undefined;
  const [head, setHead] = useState({
    customer_id: existing?.customer_id ?? original?.customer_id ?? initialCustomer ?? "",
    issue_date: existing?.issue_date ?? todayIso(),
    second_date: (billing ? inv?.due_date : quote?.valid_until) ?? "",
    reference: existing?.reference ?? "",
    notes: existing?.notes ?? "",
  });
  const [tags, setTags] = useState(tagsOf(existing));
  const [includeTax, setIncludeTax] = useState(existing?.prices_include_tax ?? false);
  // A new document's first line takes the workspace's default VAT rate, which loads after the form opens.
  const [stored, setStored] = useState<EditLine[] | null>(existing?.lines?.length ? linesFromDocument(existing.lines) : null);
  const lines = stored ?? [blankLine(defaultVat)];
  const setLines = (update: (prev: EditLine[]) => EditLine[]) => setStored((prev) => update(prev ?? [blankLine(defaultVat)]));

  const save = useMutation({
    mutationFn: async (andIssue: boolean) => {
      const body = {
        customer_id: head.customer_id,
        issue_date: head.issue_date,
        reference: head.reference,
        notes: head.notes,
        prices_include_tax: includeTax,
        lines: linesToRequest(lines),
        ...tagsBody(tags),
        ...(head.second_date ? (billing ? { due_date: head.second_date } : { valid_until: head.second_date }) : {}),
        ...(kind === "debit_note" && !existing ? { kind: "debit_note" as const, original_invoice_id: original?.id ?? null } : {}),
      };
      if (kind === "quotation") {
        const q = existing
          ? unwrap(await api.PATCH("/api/v1/w/{workspace}/quotations/{id}/", { params: { path: { workspace: slug, id: existing.id } }, body }))
          : unwrap(await api.POST("/api/v1/w/{workspace}/quotations/", { ...wsPath(slug), body }));
        return { id: q.id, issued: false };
      }
      const saved = existing
        ? unwrap(await api.PATCH("/api/v1/w/{workspace}/invoices/{id}/", { params: { path: { workspace: slug, id: existing.id } }, body }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/invoices/", { ...wsPath(slug), body }));
      if (andIssue) unwrap(await api.POST("/api/v1/w/{workspace}/invoices/{id}/issue/", { params: { path: { workspace: slug, id: saved.id } } }));
      return { id: saved.id, issued: andIssue };
    },
    onSuccess: ({ id, issued }) => {
      toast.success(kind === "quotation" ? "Quotation saved" : issued ? (kind === "debit_note" ? "Debit note issued" : "Invoice issued") : "Draft saved");
      router.push(`/w/${slug}/sales/${billing ? "invoices" : "quotations"}/${id}`);
    },
  });

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(false); }}>
      <Card className="grid gap-3 p-4 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <Field label="Customer" error={fieldError(save.error, "customer_id")}>
            <Select required disabled={Boolean(original)} value={head.customer_id} onChange={(e) => setHead((prev) => ({ ...prev, customer_id: e.target.value }))}>
              <option value="">Choose a customer</option>
              {(customers.data?.results ?? []).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.number})</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Date" error={fieldError(save.error, "issue_date")}><Input type="date" required value={head.issue_date} onChange={(e) => setHead((prev) => ({ ...prev, issue_date: e.target.value }))} /></Field>
        <Field label={billing ? "Due date" : "Valid until"} hint={billing ? "Blank: from the customer's payment terms." : "Blank: 30 days."}
          error={fieldError(save.error, billing ? "due_date" : "valid_until")}>
          <Input type="date" value={head.second_date} onChange={(e) => setHead((prev) => ({ ...prev, second_date: e.target.value }))} />
        </Field>
        <div className="sm:col-span-2"><Field label="Customer's reference (LPO or order no.)"><Input value={head.reference} onChange={(e) => setHead((prev) => ({ ...prev, reference: e.target.value }))} /></Field></div>
        <TagPickers value={tags} onChange={setTags} />
      </Card>
      <LinesEditor slug={slug} customerId={head.customer_id} lines={lines} setLines={setLines} includeTax={includeTax} setIncludeTax={setIncludeTax} currency={context.workspace.currency ?? "KES"} />
      <Field label="Notes printed on the document"><Textarea value={head.notes} onChange={(e) => setHead((prev) => ({ ...prev, notes: e.target.value }))} /></Field>
      <FormError error={save.error} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" variant={billing ? "secondary" : "primary"} loading={save.isPending && !save.variables}>{billing ? "Save draft" : "Save quotation"}</Button>
        {billing && <Button type="button" loading={save.isPending && save.variables} onClick={() => save.mutate(true)}>Save and issue</Button>}
      </div>
    </form>
  );
}
