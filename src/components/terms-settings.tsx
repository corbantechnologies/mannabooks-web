"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, Field, FormError, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace, wsPath } from "@/lib/workspace";

const KINDS: [string, string, string][] = [
  ["invoice", "Invoices", "e.g. Payment within the days on the invoice. Late payment attracts 2% a month. Goods remain ours until paid in full. Bank charges are the customer's. Queries within 7 days."],
  ["quotation", "Quotations", "e.g. Valid for 30 days. Prices may change after that. A 50% deposit starts the work. Anything not listed is extra."],
  ["cash_sale", "Cash sales", "e.g. Goods sold are not returnable except when faulty, within 7 days with this receipt."],
  ["delivery_note", "Delivery notes", "e.g. Goods received in good order and condition. Shortages reported within 24 hours."],
  ["purchase_order", "Purchase orders (LPO)", "e.g. Deliver by the date given. Invoice with an eTIMS invoice quoting this LPO number. We may reject goods not as ordered."],
  ["service_order", "Service orders", "e.g. Work is accepted once confirmed in writing. Invoice with an eTIMS invoice quoting this order number."],
];

/**
 * The business's standard terms and conditions, one per kind of document. Each new document gets a copy (a customer's
 * own agreed terms win on their documents), and the copy stays with it once issued.
 */
export function TermsSettings({ canEdit }: { canEdit: boolean }) {
  const { slug, context } = useWorkspace();
  const [terms, setTerms] = useState<Record<string, string>>(() => ({ ...((context.workspace as { document_terms?: Record<string, string> }).document_terms ?? {}) }));
  const [open, setOpen] = useState<string>("invoice");
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PATCH("/api/v1/w/{workspace}/", { ...wsPath(slug), body: { document_terms: terms } as never })),
    onSuccess: () => toast.success("Terms saved. New documents use them from now on."),
  });
  return (
    <Card className="p-5">
      <h2 className="font-semibold">Terms and conditions</h2>
      <p className="mt-1 text-sm text-stone-600">Written once, printed on every new document of that kind. A customer with their own agreed terms (on their record) gets those instead. Issued documents keep the terms they were made with.</p>
      <div className="mt-4 flex flex-wrap gap-1 border-b border-stone-200">
        {KINDS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setOpen(k)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${open === k ? "border-brand-700 font-medium text-brand-800" : "border-transparent text-stone-500 hover:text-stone-800"}`}>
            {label}{terms[k]?.trim() ? " ✓" : ""}
          </button>
        ))}
      </div>
      {KINDS.filter(([k]) => k === open).map(([k, label, example]) => (
        <Field key={k} label={`Terms on ${label.toLowerCase()}`} hint={k === "invoice" ? "The due date is added above them in words, e.g. \"Payment due by 28 Nov 2026, 30 days from the invoice date\"." : undefined}>
          <Textarea rows={7} disabled={!canEdit} placeholder={example} value={terms[k] ?? ""} onChange={(e) => setTerms((t) => ({ ...t, [k]: e.target.value }))} />
        </Field>
      ))}
      <FormError error={save.error} />
      {canEdit && <div className="mt-3 flex justify-end"><Button loading={save.isPending} onClick={() => save.mutate()}>Save terms</Button></div>}
    </Card>
  );
}
