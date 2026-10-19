"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { useAccounts } from "@/lib/api/accounting";
import { METHODS, type FixedAsset, useAssetCategories } from "@/lib/api/assets";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { useCostCenters } from "@/lib/api/control";
import { useSuppliers } from "@/lib/api/purchasing";
import { todayIso } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

import { Button, Card, Field, FormError, Input, Select, Textarea } from "./ui";

export function AssetForm({ existing }: { existing?: FixedAsset }) {
  const { slug } = useWorkspace();
  const router = useRouter();
  const categories = useAssetCategories(slug);
  const accounts = useAccounts(slug);
  const centres = useCostCenters(slug);
  const suppliers = useSuppliers(slug);
  const branches = useQuery({ queryKey: ["branches", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/branches/", { params: { path: { workspace: slug } } })) });
  const staff = useQuery({
    queryKey: ["employees", slug, "picker"],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/employees/", { params: { path: { workspace: slug }, query: { page_size: 200 } } })),
  });
  const locked = Boolean(existing?.depreciated_to && existing.acquisition === "recorded") || existing?.status === "disposed";
  const [f, setF] = useState({
    name: existing?.name ?? "", category: (existing?.category ?? "computers") as string, description: existing?.description ?? "", serial_number: existing?.serial_number ?? "",
    purchase_date: existing?.purchase_date ?? todayIso(), in_service_date: existing?.in_service_date ?? "", cost: existing?.cost ?? "",
    residual_value: existing?.residual_value ?? "0", method: (existing?.method ?? "") as string, life_years: existing ? String((existing.useful_life_months ?? 0) / 12) : "",
    rate_percent: existing?.rate_percent ?? "", asset_account_id: existing?.asset_account_id ?? "", expense_account_id: existing?.expense_account_id ?? "",
    acquisition: (existing?.acquisition ?? "recorded") as string, opening_accumulated: existing?.opening_accumulated ?? "0", depreciated_to: existing?.depreciated_to ?? "",
    location_id: existing?.location_id ?? "", custodian_id: existing?.custodian_id ?? "", cost_center_id: existing?.cost_center_id ?? "",
    supplier_id: existing?.supplier_id ?? "", notes: existing?.notes ?? "",
  });
  const cat = categories.data?.find((c) => c.category === f.category);
  const method = f.method || cat?.method || "straight_line";
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const fixedAccounts = (accounts.data ?? []).filter((a) => a.subtype === "fixed_asset" && a.system_key !== "accumulated_depreciation" && a.is_active);
  const expenseAccounts = (accounts.data ?? []).filter((a) => a.account_type === "expense" && a.is_active);
  const save = useMutation({
    mutationFn: async () => {
      const life = f.life_years || (cat ? String(cat.useful_life_months / 12) : "");
      const body: Record<string, unknown> = {
        name: f.name, category: f.category, description: f.description, serial_number: f.serial_number, notes: f.notes,
        location_id: f.location_id || null, custodian_id: f.custodian_id || null, cost_center_id: f.cost_center_id || null, supplier_id: f.supplier_id || null,
      };
      if (!locked) Object.assign(body, {
        purchase_date: f.purchase_date, in_service_date: f.in_service_date || f.purchase_date, cost: f.cost, residual_value: f.residual_value || "0",
        method, useful_life_months: Math.round(Number(life || 0) * 12), rate_percent: f.rate_percent || cat?.rate_percent || "0",
        acquisition: f.acquisition, opening_accumulated: f.acquisition === "existing" ? f.opening_accumulated || "0" : "0",
        depreciated_to: f.acquisition === "existing" && f.depreciated_to ? f.depreciated_to : null,
        ...(f.asset_account_id ? { asset_account_id: f.asset_account_id } : {}), ...(f.expense_account_id ? { expense_account_id: f.expense_account_id } : {}),
      });
      return existing
        ? unwrap(await api.PATCH("/api/v1/w/{workspace}/fixed-assets/{id}/", { params: { path: { workspace: slug, id: existing.id } }, body: body as never }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/fixed-assets/", { params: { path: { workspace: slug } }, body: body as never }));
    },
    onSuccess: (a) => { toast.success(`${a.number} saved`); router.push(`/w/${slug}/accounting/fixed-assets/${a.id}`); },
  });
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <Card className="grid gap-3 p-4 sm:grid-cols-4">
        <div className="sm:col-span-2"><Field label="Name" error={fieldError(save.error, "name")}><Input required value={f.name} onChange={set("name")} placeholder="Isuzu NKR lorry KDA 123A" /></Field></div>
        <Field label="Category"><Select value={f.category} disabled={locked} onChange={(e) => setF((p) => ({ ...p, category: e.target.value, method: "", life_years: "", rate_percent: "", asset_account_id: "" }))}>
          {(categories.data ?? []).map((c) => <option key={c.category} value={c.category}>{c.label}</option>)}</Select></Field>
        <Field label="Serial or registration no."><Input value={f.serial_number} onChange={set("serial_number")} /></Field>
        <Field label="Where it is"><Select value={f.location_id} onChange={set("location_id")}><option value="">Not set</option>{(branches.data?.results ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
        <Field label="Looked after by"><Select value={f.custodian_id} onChange={set("custodian_id")}><option value="">Nobody in particular</option>{(staff.data?.results ?? []).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</Select></Field>
        <Field label="Supplier"><Select value={f.supplier_id} onChange={set("supplier_id")}><option value="">Not set</option>{(suppliers.data?.results ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        {(centres.data ?? []).length > 0 && <Field label="Cost centre" hint="Its depreciation is charged here."><Select value={f.cost_center_id} onChange={set("cost_center_id")}><option value="">None</option>{centres.data!.filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>}
      </Card>
      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold">Cost and depreciation</h2>
        {locked && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">Depreciation has been charged, so the cost, dates and method are fixed. Undo the depreciation runs to change them.</p>}
        <fieldset disabled={locked} className="space-y-3">
          <div className="space-y-1.5 text-sm">
            <label className="flex items-start gap-2"><input type="radio" checked={f.acquisition === "recorded"} onChange={() => setF((p) => ({ ...p, acquisition: "recorded" }))} className="mt-1" />
              <span>Bought with a bill or expense already in MannaBooks <span className="block text-xs text-stone-500">Post that bill or expense to the fixed asset account; this only adds it to the register.</span></span></label>
            <label className="flex items-start gap-2"><input type="radio" checked={f.acquisition === "existing"} onChange={() => setF((p) => ({ ...p, acquisition: "existing" }))} className="mt-1" />
              <span>Owned before we started using MannaBooks <span className="block text-xs text-stone-500">Its cost, and the depreciation already charged, are brought into the books.</span></span></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Bought on"><Input type="date" required value={f.purchase_date} onChange={set("purchase_date")} /></Field>
            <Field label="In use from" hint="Blank: the purchase date."><Input type="date" value={f.in_service_date} onChange={set("in_service_date")} /></Field>
            <Field label="Cost (before VAT)" error={fieldError(save.error, "cost")}><Input type="number" min="0" step="0.01" required value={f.cost} onChange={set("cost")} /></Field>
            <Field label="Worth at the end" hint="Residual value; often 0."><Input type="number" min="0" step="0.01" value={f.residual_value} onChange={set("residual_value")} /></Field>
            <Field label="Method"><Select value={method} onChange={set("method")}>{METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
            {method === "straight_line" && <Field label="Useful life (years)"><Input type="number" min="0.5" step="0.5" value={f.life_years || (cat ? String(cat.useful_life_months / 12) : "")} onChange={set("life_years")} /></Field>}
            {method === "reducing_balance" && <Field label="Rate a year (%)"><Input type="number" min="0" max="100" step="0.5" value={f.rate_percent || (cat?.rate_percent ?? "")} onChange={set("rate_percent")} /></Field>}
            <Field label="Cost account"><Select value={f.asset_account_id || cat?.asset_account_id || ""} onChange={set("asset_account_id")}>{fixedAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}</Select></Field>
            <Field label="Depreciation expense"><Select value={f.expense_account_id} onChange={set("expense_account_id")}><option value="">Depreciation (usual)</option>{expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}</Select></Field>
            {f.acquisition === "existing" && <>
              <Field label="Depreciation already charged" hint="Up to the date on the right."><Input type="number" min="0" step="0.01" value={f.opening_accumulated} onChange={set("opening_accumulated")} /></Field>
              <Field label="Charged up to"><Input type="date" value={f.depreciated_to} onChange={set("depreciated_to")} /></Field>
            </>}
          </div>
          <p className="text-xs text-stone-500">{METHODS.find((m) => m.value === method)?.hint}</p>
        </fieldset>
      </Card>
      <Field label="Description and notes"><Textarea rows={2} value={f.notes} onChange={set("notes")} /></Field>
      <FormError error={save.error} />
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button><Button type="submit" loading={save.isPending}>Save asset</Button></div>
    </form>
  );
}
