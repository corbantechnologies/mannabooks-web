"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { api, fieldError, unwrap } from "@/lib/api/client";
import { FREQUENCIES, useCustomers } from "@/lib/api/sales";
import type { RecurringInvoice } from "@/lib/api/types";
import { todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

import { EditLine, LinesEditor, blankLine, linesFromDocument, linesToRequest, useDefaultVat } from "./lines-editor";
import { Button, Card, Field, FormError, Input, Select, Textarea } from "./ui";

export function RecurringForm({ existing, onDone }: { existing?: RecurringInvoice; onDone?: () => void }) {
  const { slug, context } = useWorkspace();
  const router = useRouter();
  const customers = useCustomers(slug);
  const defaultVat = useDefaultVat(slug);
  const [head, setHead] = useState({
    name: existing?.name ?? "", customer_id: existing?.customer_id ?? "", frequency: (existing?.frequency ?? "monthly") as keyof typeof FREQUENCIES,
    start_date: existing?.start_date ?? todayIso(), end_date: existing?.end_date ?? "", auto_issue: existing?.auto_issue ?? false,
    reference: existing?.reference ?? "", notes: existing?.notes ?? "",
  });
  const [includeTax, setIncludeTax] = useState(existing?.prices_include_tax ?? false);
  const [stored, setStored] = useState<EditLine[] | null>(existing?.lines?.length ? linesFromDocument(existing.lines.map((l) => ({ ...l, unit_price: l.unit_price ?? undefined }))) : null);
  const lines = stored ?? [blankLine(defaultVat)];
  const setLines = (update: (prev: EditLine[]) => EditLine[]) => setStored((prev) => update(prev ?? [blankLine(defaultVat)]));
  const save = useMutation({
    mutationFn: async () => {
      const body = {
        ...head, end_date: head.end_date || null, prices_include_tax: includeTax,
        lines: linesToRequest(lines).map((l) => ({ product_id: l.product_id, description: l.description, quantity: l.quantity, unit_price: l.unit_price, discount_percent: l.discount_percent, tax_rate_id: l.tax_rate_id })),
      };
      return existing
        ? unwrap(await api.PATCH("/api/v1/w/{workspace}/recurring-invoices/{id}/", { params: { path: { workspace: slug, id: existing.id } }, body }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/recurring-invoices/", { ...wsPath(slug), body }));
    },
    onSuccess: (r) => {
      toast.success(existing ? "Schedule saved" : r.invoices_created ? `Schedule saved; first invoice ${r.last_invoice_number || "raised"}` : "Schedule saved");
      if (onDone) onDone();
      else router.push(`/w/${slug}/sales/recurring-invoices/${r.id}`);
    },
  });
  const set = (key: keyof typeof head) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setHead((prev) => ({ ...prev, [key]: e.target.value }));
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <Card className="grid gap-3 p-4 sm:grid-cols-4">
        <div className="sm:col-span-2"><Field label="Name" error={fieldError(save.error, "name")}><Input required value={head.name} onChange={set("name")} placeholder="Shop rent, Unit 4" /></Field></div>
        <div className="sm:col-span-2">
          <Field label="Customer" error={fieldError(save.error, "customer_id")}>
            <Select required value={head.customer_id} onChange={set("customer_id")}>
              <option value="">Choose a customer</option>
              {(customers.data?.results ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Every"><Select value={head.frequency} onChange={set("frequency")}>{Object.entries(FREQUENCIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="First invoice on" error={fieldError(save.error, "start_date")} hint="Today or earlier raises it now."><Input type="date" required value={head.start_date} onChange={set("start_date")} /></Field>
        <Field label="Last invoice by" error={fieldError(save.error, "end_date")} hint="Blank: until you stop it."><Input type="date" value={head.end_date} onChange={set("end_date")} /></Field>
        <Field label="Customer's reference"><Input value={head.reference} onChange={set("reference")} /></Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-4">
          <input type="checkbox" checked={head.auto_issue} onChange={(e) => setHead((prev) => ({ ...prev, auto_issue: e.target.checked }))} />
          Issue the invoices automatically (otherwise each waits as a draft for you to check and issue)
        </label>
      </Card>
      <LinesEditor slug={slug} customerId={head.customer_id} lines={lines} setLines={setLines} includeTax={includeTax} setIncludeTax={setIncludeTax} currency={context.workspace.currency ?? "KES"} />
      <Field label="Notes printed on each invoice"><Textarea value={head.notes} onChange={set("notes")} /></Field>
      <FormError error={save.error} />
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => (onDone ? onDone() : router.back())}>Cancel</Button><Button type="submit" loading={save.isPending}>Save schedule</Button></div>
    </form>
  );
}
