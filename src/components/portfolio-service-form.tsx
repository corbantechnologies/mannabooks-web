"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, Field, FormError, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useSuppliers } from "@/lib/api/purchasing";
import { useProducts, useVatRates } from "@/lib/api/sales";
import { CYCLES, type PortfolioDetail, type PortfolioService, SERVICE_KINDS } from "@/lib/portfolios";
import { useWorkspace } from "@/lib/workspace";

const blank = {
  name: "", kind: "other", status: "active", product_id: "", tax_rate_id: "", quantity: "1", price: "0", billing_cycle: "monthly",
  contract_start: "", contract_end: "", next_bill_date: "", prepaid_from: "", prepaid_to: "", cost: "0", cost_cycle: "monthly",
  supplier_id: "", supplier_renewal_date: "", remind_days: "30", notes: "", group_id: "", reason: "",
};

/** Where Add a service and Change go: their own pages. `back` is the page to return to (the portfolio, or a group). */
export function serviceNewHref(slug: string, portfolioId: string, groupId = "", back = "") {
  const q = new URLSearchParams({ ...(groupId ? { group: groupId } : {}), ...(back ? { back } : {}) }).toString();
  return `/w/${slug}/portfolios/${portfolioId}/services/new${q ? `?${q}` : ""}`;
}

export function serviceEditHref(slug: string, portfolioId: string, serviceId: string, back = "") {
  return `/w/${slug}/portfolios/${portfolioId}/services/${serviceId}/edit${back ? `?${new URLSearchParams({ back })}` : ""}`;
}

/** Only a page inside this workspace's portfolio is a place to go back to. */
export function safeBack(slug: string, portfolioId: string, back: string | null) {
  const home = `/w/${slug}/portfolios/${portfolioId}`;
  return back && back.startsWith(home) ? back : home;
}

/**
 * Add a service to a portfolio, or change one: a page, as it has the client's side, your side, dates and notes.
 * Price, quantity and cost changes ask why, for the history.
 */
export function ServiceEditor({ d, service, groupId = "", back }: { d: PortfolioDetail; service?: PortfolioService; groupId?: string; back: string }) {
  const { slug } = useWorkspace();
  const router = useRouter();
  const qc = useQueryClient();
  const products = useProducts(slug);
  const rates = useVatRates(slug);
  const suppliers = useSuppliers(slug);
  const groups = d.groups;
  const start = service ? Object.fromEntries(Object.keys(blank).map((k) => [k, String((service as Record<string, unknown>)[k] ?? "")])) as typeof blank : blank;
  const [f, setF] = useState({ ...start, ...(service ? {} : { group_id: groupId }), reason: "" });
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
        : unwrap(await api.POST("/api/v1/w/{workspace}/portfolios/{id}/services/", { params: { path: { workspace: slug, id: d.id } }, body: body as never }));
    },
    onSuccess: (p) => {
      qc.setQueryData(["portfolio", slug, d.id], p);
      toast.success(service ? "Saved" : `${f.name} added`);
      router.push(back);
    },
  });
  return (
    <div className="w-full">
      <PageHeader title={service ? `Change ${service.name}` : "Add a service"} guide="client-portfolios"
        description={service ? `In ${d.customer_name}'s portfolio${service.group_name ? `, ${service.group_name}` : ""}.` : `To ${d.customer_name}'s portfolio.`} />
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Card className="p-4 sm:p-5">
          <div className={groups.length ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-4" : "grid gap-3 sm:grid-cols-3"}>
            {groups.length > 0 && (
              <Field label="Group"><Select value={f.group_id} onChange={set("group_id")}>
                <option value="">No group</option>
                {groups.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select></Field>
            )}
            <Field label="Service"><Input required value={f.name} onChange={set("name")} placeholder="e.g. Google Workspace, 12 users" /></Field>
            <Field label="Kind"><Select value={f.kind} onChange={set("kind")}>{SERVICE_KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
            <Field label="Status"><Select value={f.status} onChange={set("status")}><option value="active">Active</option><option value="paused">Paused</option><option value="ended">Ended</option></Select></Field>
          </div>
        </Card>
        <Card className="space-y-3 p-4 sm:p-5">
          <h2 className="text-sm font-semibold">The client pays</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Paid in advance from" hint="Shows how much is earned so far and how much is left"><Input type="date" value={f.prepaid_from} onChange={set("prepaid_from")} /></Field>
              <Field label="to"><Input type="date" value={f.prepaid_to} onChange={set("prepaid_to")} /></Field>
            </div>
          )}
        </Card>
        <Card className="space-y-3 p-4 sm:p-5">
          <h2 className="text-sm font-semibold">It costs you</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Cost" hint="In total, per cost cycle"><Input type="number" inputMode="decimal" min="0" step="0.01" value={f.cost} onChange={set("cost")} /></Field>
            <Field label="Every"><Select value={f.cost_cycle} onChange={set("cost_cycle")}>{CYCLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
            <Field label="Supplier">
              <Select value={f.supplier_id} onChange={set("supplier_id")}><option value="">None</option>{(suppliers.data?.results ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
            </Field>
            <Field label="Renew with them by" hint="When you must pay the supplier"><Input type="date" value={f.supplier_renewal_date} onChange={set("supplier_renewal_date")} /></Field>
          </div>
        </Card>
        <Card className="p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Remind (days before)" hint="Before the bill and renewal dates"><Input type="number" inputMode="numeric" min="0" max="365" value={f.remind_days} onChange={set("remind_days")} /></Field>
            <div className="sm:col-span-3"><Field label="Notes"><Textarea rows={3} value={f.notes} onChange={set("notes")} /></Field></div>
          </div>
          {money && (
            <div className="mt-3"><Field label="Why the change?" hint="Kept in the history, to show the client when and why their bill changed">
              <Input value={f.reason} onChange={set("reason")} placeholder="e.g. Supplier price rise from January" />
            </Field></div>
          )}
        </Card>
        <FormError error={save.error} />
        <div className="sticky bottom-0 z-10 flex justify-end gap-2 rounded-lg border border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">
          <Button type="button" variant="secondary" onClick={() => router.push(back)}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>{service ? "Save" : "Add the service"}</Button>
        </div>
      </form>
    </div>
  );
}
