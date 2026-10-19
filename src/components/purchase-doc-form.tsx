"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { api, fieldError, unwrap } from "@/lib/api/client";
import { useSuppliers, useWarehouses } from "@/lib/api/purchasing";
import type { Bill, PurchaseOrder, ServiceOrder } from "@/lib/api/types";
import { todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

import { useDefaultVat } from "./lines-editor";
import { BuyLine, PurchaseLinesEditor, blankBuyLine, buyLinesFrom, buyLinesToRequest } from "./purchase-lines";
import { TagPickers, tagsBody, tagsOf } from "./tag-pickers";
import { Button, Card, Field, FormError, Input, Select, Textarea } from "./ui";

type Kind = "order" | "service" | "bill";
const PATHS = { order: "orders", service: "service-orders", bill: "bills" } as const;

/** Create or edit a draft purchase order, service order or bill. */
export function PurchaseDocForm({ kind, existing, supplierId }: { kind: Kind; existing?: PurchaseOrder | ServiceOrder | Bill; supplierId?: string }) {
  const { slug } = useWorkspace();
  const router = useRouter();
  const suppliers = useSuppliers(slug);
  const warehouses = useWarehouses(slug);
  const defaultVat = useDefaultVat(slug);
  const po = existing as PurchaseOrder | undefined;
  const so = existing as ServiceOrder | undefined;
  const bill = existing as Bill | undefined;
  const [head, setHead] = useState({
    supplier_id: existing?.supplier_id ?? supplierId ?? "", date: (kind === "bill" ? bill?.bill_date : kind === "service" ? so?.order_date : po?.order_date) ?? todayIso(),
    second: (kind === "bill" ? bill?.due_date : kind === "service" ? so?.required_by : po?.expected_date) ?? "",
    warehouse_id: (kind === "order" ? po?.warehouse_id : bill?.warehouse_id) ?? "", reference: existing?.reference ?? "", notes: existing?.notes ?? "",
    scope: so?.scope ?? "", supplier_invoice_number: bill?.supplier_invoice_number ?? "", supplier_etims_number: bill?.supplier_etims_number ?? "",
  });
  const [tags, setTags] = useState(tagsOf(existing));
  const [includeTax, setIncludeTax] = useState(existing?.prices_include_tax ?? false);
  const [stored, setStored] = useState<BuyLine[] | null>(existing?.lines?.length ? buyLinesFrom(existing.lines) : null);
  const lines = stored ?? [blankBuyLine(defaultVat)];
  const setLines = (update: (prev: BuyLine[]) => BuyLine[]) => setStored((prev) => update(prev ?? [blankBuyLine(defaultVat)]));
  const set = (key: keyof typeof head) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setHead((prev) => ({ ...prev, [key]: e.target.value }));

  const save = useMutation({
    mutationFn: async (andPost: boolean) => {
      const common = { supplier_id: head.supplier_id, prices_include_tax: includeTax, reference: head.reference, notes: head.notes, lines: buyLinesToRequest(lines), ...tagsBody(tags) };
      if (kind === "order") {
        const body = { ...common, order_date: head.date, expected_date: head.second || null, warehouse_id: head.warehouse_id || null };
        const r = existing
          ? unwrap(await api.PATCH("/api/v1/w/{workspace}/purchase-orders/{id}/", { params: { path: { workspace: slug, id: existing.id } }, body: body as never }))
          : unwrap(await api.POST("/api/v1/w/{workspace}/purchase-orders/", { ...wsPath(slug), body: body as never }));
        return r.id;
      }
      if (kind === "service") {
        const body = { ...common, order_date: head.date, required_by: head.second || null, scope: head.scope };
        const r = existing
          ? unwrap(await api.PATCH("/api/v1/w/{workspace}/service-orders/{id}/", { params: { path: { workspace: slug, id: existing.id } }, body: body as never }))
          : unwrap(await api.POST("/api/v1/w/{workspace}/service-orders/", { ...wsPath(slug), body: body as never }));
        return r.id;
      }
      const body = { ...common, bill_date: head.date, ...(head.second ? { due_date: head.second } : {}), warehouse_id: head.warehouse_id || null,
        supplier_invoice_number: head.supplier_invoice_number, supplier_etims_number: head.supplier_etims_number };
      const r = existing
        ? unwrap(await api.PATCH("/api/v1/w/{workspace}/bills/{id}/", { params: { path: { workspace: slug, id: existing.id } }, body: body as never }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/bills/", { ...wsPath(slug), body: body as never }));
      if (andPost) unwrap(await api.POST("/api/v1/w/{workspace}/bills/{id}/post/", { params: { path: { workspace: slug, id: r.id } } }));
      return r.id;
    },
    onSuccess: (id, andPost) => { toast.success(andPost ? "Bill posted" : "Saved"); router.push(`/w/${slug}/purchasing/${PATHS[kind]}/${id}`); },
  });

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(false); }}>
      <Card className="grid gap-3 p-4 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <Field label="Supplier" error={fieldError(save.error, "supplier_id")}>
            <Select required value={head.supplier_id} onChange={set("supplier_id")}>
              <option value="">Choose a supplier</option>
              {(suppliers.data?.results ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label={kind === "bill" ? "Bill date" : "Order date"}><Input type="date" required value={head.date} onChange={set("date")} /></Field>
        <Field label={kind === "bill" ? "Due date" : kind === "service" ? "Needed by" : "Expected delivery"} hint={kind === "bill" ? "Blank: from the supplier's terms." : undefined}>
          <Input type="date" value={head.second} onChange={set("second")} />
        </Field>
        {kind === "bill" && <Field label="Supplier's invoice number" error={fieldError(save.error, "supplier_invoice_number")}><Input required value={head.supplier_invoice_number} onChange={set("supplier_invoice_number")} /></Field>}
        {kind === "bill" && <Field label="Their eTIMS CU invoice no." hint="Needed to claim the input VAT."><Input value={head.supplier_etims_number} onChange={set("supplier_etims_number")} /></Field>}
        {kind !== "service" && (
          <Field label={kind === "order" ? "Deliver to" : "Stock goes to"}>
            <Select value={head.warehouse_id} onChange={set("warehouse_id")}>
              <option value="">Default warehouse</option>
              {(warehouses.data?.results ?? []).filter((w) => w.is_active).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Reference"><Input value={head.reference} onChange={set("reference")} /></Field>
        <TagPickers value={tags} onChange={setTags} />
        {kind === "service" && <div className="sm:col-span-4"><Field label="Work to be done"><Textarea rows={3} value={head.scope} onChange={set("scope")} /></Field></div>}
      </Card>
      <PurchaseLinesEditor slug={slug} lines={lines} setLines={setLines} includeTax={includeTax} setIncludeTax={setIncludeTax} accounts={kind !== "order"} />
      <Field label="Notes"><Textarea value={head.notes} onChange={set("notes")} /></Field>
      <FormError error={save.error} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" variant={kind === "bill" ? "secondary" : "primary"} loading={save.isPending && !save.variables}>{kind === "bill" ? "Save draft" : "Save"}</Button>
        {kind === "bill" && <Button type="button" loading={save.isPending && save.variables} onClick={() => save.mutate(true)}>Save and post</Button>}
      </div>
    </form>
  );
}
