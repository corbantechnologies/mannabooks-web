"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { Button, Field, FormError, Input, Modal, Select, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useSuppliers } from "@/lib/api/purchasing";
import { useProducts, useVatRates } from "@/lib/api/sales";
import { CYCLES, type PortfolioDetail, type PortfolioService, SERVICE_KINDS } from "@/lib/portfolios";
import { useWorkspace } from "@/lib/workspace";

const blank = {
  name: "", kind: "other", status: "active", product_id: "", tax_rate_id: "", quantity: "1", price: "0", billing_cycle: "monthly",
  contract_start: "", contract_end: "", next_bill_date: "", prepaid_from: "", prepaid_to: "", cost: "0", cost_cycle: "monthly",
  supplier_id: "", supplier_renewal_date: "", remind_days: "30", notes: "", reason: "",
};

/** Add a service to a portfolio, or change one. Price, quantity and cost changes ask why, for the history. */
export function ServiceForm({ portfolioId, service, open, onClose, onSaved }: {
  portfolioId: string; service?: PortfolioService | null; open: boolean; onClose: () => void; onSaved: (p: PortfolioDetail) => void;
}) {
  const { slug } = useWorkspace();
  const products = useProducts(slug);
  const rates = useVatRates(slug);
  const suppliers = useSuppliers(slug);
  const start = service ? Object.fromEntries(Object.keys(blank).map((k) => [k, String((service as Record<string, unknown>)[k] ?? "")])) as typeof blank : blank;
  const [f, setF] = useState({ ...start, reason: "" });
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const money = service && (f.price !== String(service.price) || f.quantity !== String(service.quantity) || f.cost !== String(service.cost));
  const save = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(f)) {
        if (k.endsWith("_id") || k.includes("date") || k.startsWith("contract_") || k.startsWith("prepaid_")) body[k] = v || null;
        else body[k] = v;
      }
      if (!service) delete body.reason;
      return service
        ? unwrap(await api.PATCH("/api/v1/w/{workspace}/portfolios/services/{id}/", { params: { path: { workspace: slug, id: service.id } }, body: body as never }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/portfolios/{id}/services/", { params: { path: { workspace: slug, id: portfolioId } }, body: body as never }));
    },
    onSuccess: (p) => { onSaved(p); onClose(); },
  });
  return (
    <Modal open={open} title={service ? `Change ${service.name}` : "Add a service"} onClose={onClose} size="lg">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Service"><Input required value={f.name} onChange={set("name")} placeholder="e.g. Google Workspace, 12 users" /></Field>
          <Field label="Kind"><Select value={f.kind} onChange={set("kind")}>{SERVICE_KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
          <Field label="Status"><Select value={f.status} onChange={set("status")}><option value="active">Active</option><option value="paused">Paused</option><option value="ended">Ended</option></Select></Field>
        </div>
        <fieldset className="rounded-md border border-stone-200 p-3">
          <legend className="px-1 text-sm font-medium">The client pays</legend>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Quantity"><Input type="number" inputMode="decimal" min="0.001" step="any" value={f.quantity} onChange={set("quantity")} /></Field>
            <Field label="Price each" hint={f.kind === "hosting" ? "Hosting with apps: worked out from the apps" : undefined}><Input type="number" inputMode="decimal" min="0" step="0.01" value={f.price} onChange={set("price")} /></Field>
            <Field label="Every"><Select value={f.billing_cycle} onChange={set("billing_cycle")}>{CYCLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
            <Field label="Next bill date" hint="When to bill them next"><Input type="date" value={f.next_bill_date} onChange={set("next_bill_date")} /></Field>
            <Field label="Contract starts"><Input type="date" value={f.contract_start} onChange={set("contract_start")} /></Field>
            <Field label="Contract ends"><Input type="date" value={f.contract_end} onChange={set("contract_end")} /></Field>
            <Field label="On the invoice as" hint="Its income account and VAT">
              <Select value={f.product_id} onChange={set("product_id")}><option value="">Service income</option>{(products.data?.results ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
            </Field>
            <Field label="VAT">
              <Select value={f.tax_rate_id} onChange={set("tax_rate_id")}><option value="">As the product, or the usual rate</option>{(rates.data?.results ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>
            </Field>
          </div>
          {f.kind === "prepaid" && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Paid in advance from" hint="Shows how much is earned so far and how much is left"><Input type="date" value={f.prepaid_from} onChange={set("prepaid_from")} /></Field>
              <Field label="to"><Input type="date" value={f.prepaid_to} onChange={set("prepaid_to")} /></Field>
            </div>
          )}
        </fieldset>
        <fieldset className="rounded-md border border-stone-200 p-3">
          <legend className="px-1 text-sm font-medium">It costs you</legend>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Cost" hint="In total, per cost cycle"><Input type="number" inputMode="decimal" min="0" step="0.01" value={f.cost} onChange={set("cost")} /></Field>
            <Field label="Every"><Select value={f.cost_cycle} onChange={set("cost_cycle")}>{CYCLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
            <Field label="Supplier">
              <Select value={f.supplier_id} onChange={set("supplier_id")}><option value="">None</option>{(suppliers.data?.results ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
            </Field>
            <Field label="Renew with them by" hint="When you must pay the supplier"><Input type="date" value={f.supplier_renewal_date} onChange={set("supplier_renewal_date")} /></Field>
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Remind (days before)"><Input type="number" inputMode="numeric" min="0" max="365" value={f.remind_days} onChange={set("remind_days")} /></Field>
          <div className="sm:col-span-3"><Field label="Notes"><Textarea rows={2} value={f.notes} onChange={set("notes")} /></Field></div>
        </div>
        {money && <Field label="Why the change?" hint="Kept in the history, to show the client when and why their bill changed"><Input value={f.reason} onChange={set("reason")} placeholder="e.g. Supplier price rise from January" /></Field>}
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>{service ? "Save" : "Add the service"}</Button></div>
      </form>
    </Modal>
  );
}
