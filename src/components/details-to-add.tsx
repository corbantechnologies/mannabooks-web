"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, Field, FormError, Input, Modal, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace } from "@/lib/workspace";

type Doc = {
  id: string; reference?: string | null; notes?: string | null; supplier_invoice_number?: string | null; supplier_etims_number?: string | null;
  lines?: { id?: string; description?: string | null }[];
};

/** For an invoice or bill recorded in bulk: a note that details are missing, and a short form to add them. The money doesn't change. */
export function DetailsToAdd({ kind, doc, canEdit }: { kind: "invoice" | "bill"; doc: Doc; canEdit: boolean }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const bill = kind === "bill";
  const line = doc.lines?.[0];
  const placeholder = (doc.supplier_invoice_number ?? "").startsWith("TO-ADD-");
  const [f, setF] = useState({
    supplier_invoice_number: placeholder ? "" : doc.supplier_invoice_number ?? "", supplier_etims_number: doc.supplier_etims_number ?? "",
    reference: doc.reference ?? "", notes: doc.notes === "Recorded in bulk" ? "" : doc.notes ?? "", description: line?.description ?? "", done: true,
  });
  const save = useMutation({
    mutationFn: async () => {
      const body = {
        reference: f.reference, notes: f.notes, done: f.done,
        ...(line?.id && f.description ? { lines: [{ id: line.id, description: f.description }] } : {}),
        ...(bill ? { supplier_invoice_number: f.supplier_invoice_number || doc.supplier_invoice_number, supplier_etims_number: f.supplier_etims_number } : {}),
      };
      const path = { params: { path: { workspace: slug, id: doc.id } } };
      return bill
        ? unwrap(await api.PATCH("/api/v1/w/{workspace}/bills/{id}/details/", { ...path, body: body as never }))
        : unwrap(await api.PATCH("/api/v1/w/{workspace}/invoices/{id}/details/", { ...path, body: body as never }));
    },
    onSuccess: () => {
      toast.success(f.done ? "Details added" : "Saved");
      void qc.invalidateQueries({ queryKey: [bill ? "bill" : "invoice", slug] });
      setOpen(false);
    },
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  return (
    <>
      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <span>Recorded in bulk: details to add{bill ? " (the supplier's invoice and eTIMS numbers)" : ""}. The amount, date and accounts are fixed.</span>
        {canEdit && <Button variant="secondary" onClick={() => { save.reset(); setOpen(true); }}>Add details</Button>}
      </Card>
      <Modal open={open} title="Add the details" onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          {bill && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Their invoice number"><Input required={!placeholder} value={f.supplier_invoice_number} onChange={set("supplier_invoice_number")} placeholder={placeholder ? "Not known yet" : ""} /></Field>
              <Field label="eTIMS CU invoice number"><Input value={f.supplier_etims_number} onChange={set("supplier_etims_number")} /></Field>
            </div>
          )}
          {!bill && <Field label="Customer's order or LPO number"><Input value={f.reference} onChange={set("reference")} /></Field>}
          {line?.id && <Field label="What it was" hint="The line's description"><Input value={f.description} onChange={set("description")} /></Field>}
          <Field label="Notes"><Textarea rows={2} value={f.notes} onChange={set("notes")} /></Field>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={f.done} onChange={(e) => setF((p) => ({ ...p, done: e.target.checked }))} /> These are all the details (take it off the to-add list)
          </label>
          <FormError error={save.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
        </form>
      </Modal>
    </>
  );
}
