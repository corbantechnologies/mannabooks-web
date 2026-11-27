"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { ask } from "@/components/confirm";
import { Button, Field, FormError, Input, Modal, Select, Textarea } from "@/components/ui";
import { AccountOptions, useAccounts } from "@/lib/api/accounting";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { useCategories, useUnits, useVatRates } from "@/lib/api/sales";
import type { Product } from "@/lib/api/types";
import { useWorkspace, wsPath } from "@/lib/workspace";

type Kind = "goods" | "service";
const EMPTY = { code: "", name: "", kind: "goods" as Kind, category_id: "", track_inventory: true, made_to_order: false, online: false, image_url: "", reorder_level: "0", description: "", unit: "pcs", sale_price: "", cost_price: "0", tax_rate_id: "", income_account_id: "", is_active: true, opening_quantity: "", opening_unit_cost: "",
  units: [] as { unit: string; factor: string; sale_price: string }[] };

function formOf(p: Product) {
  return {
    code: p.code ?? "", name: p.name, kind: (p.kind ?? "goods") as Kind, category_id: p.category_id ?? "", track_inventory: p.track_inventory ?? false, made_to_order: p.made_to_order ?? false, online: p.online ?? false, image_url: p.image_url ?? "", reorder_level: String(Number(p.reorder_level ?? 0)), description: p.description ?? "", unit: p.unit ?? "pcs",
    sale_price: String(Number(p.sale_price ?? 0)), cost_price: String(Number(p.cost_price ?? 0)), tax_rate_id: p.tax_rate_id ?? "",
    income_account_id: p.income_account_id ?? "", is_active: p.is_active ?? true, opening_quantity: "", opening_unit_cost: "",
    units: (p.units ?? []).map((u) => ({ unit: u.unit, factor: String(Number(u.factor)), sale_price: u.sale_price != null ? String(Number(u.sale_price)) : "" })),
  };
}

/** A product or service: name, prices, VAT, stock, other units, selling online. A page (Sales > Products > New, or a product). */
export function ProductForm({ product, onDone }: { product?: Product; onDone: () => void }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const editing: Product | "new" = product ?? "new";
  const current = product ?? null;
  // a new product starts on "Workspace default" VAT, so its category's rate can apply
  const [form, setForm] = useState(product ? formOf(product) : { ...EMPTY });
  const rates = useVatRates(slug);
  const accounts = useAccounts(slug);
  const categories = useCategories(slug);
  const units = useUnits(slug);
  const save = useMutation({
    mutationFn: async () => {
      const body = { ...form, track_inventory: form.kind === "goods" && form.track_inventory && !form.made_to_order, made_to_order: form.kind === "goods" && form.made_to_order, category_id: form.category_id || null, sale_price: form.sale_price || "0", tax_rate_id: form.tax_rate_id || null, income_account_id: form.income_account_id || null,
        opening_quantity: form.track_inventory && form.opening_quantity ? form.opening_quantity : undefined,
        opening_unit_cost: form.track_inventory && form.opening_quantity && form.opening_unit_cost ? form.opening_unit_cost : undefined,
        units: form.kind === "goods" ? form.units.filter((u) => u.unit && u.factor).map((u) => ({ unit: u.unit, factor: u.factor, sale_price: u.sale_price || null })) : [] };
      if (!product) return unwrap(await api.POST("/api/v1/w/{workspace}/products/", { ...wsPath(slug), body }));
      return unwrap(await api.PATCH("/api/v1/w/{workspace}/products/{id}/", { params: { path: { workspace: slug, id: product.id } }, body }));
    },
    onSuccess: () => { toast.success("Product saved"); void qc.invalidateQueries({ queryKey: ["products", slug] }); onDone(); },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await api.DELETE("/api/v1/w/{workspace}/products/{id}/", { params: { path: { workspace: slug, id } } })),
    onSuccess: () => { toast.success("Product deleted"); void qc.invalidateQueries({ queryKey: ["products", slug] }); onDone(); },
    onError: (e) => toast.error(e.message),
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  return (
    <Modal size="lg" open title={current ? current.name : "New product or service"} onClose={onDone}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2"><Field label="Name" error={fieldError(save.error, "name")}><Input required value={form.name} onChange={set("name")} /></Field></div>
          <Field label="Code (SKU)" hint="Blank: numbered for you (SKU-00001)." error={fieldError(save.error, "code")}><Input value={form.code} onChange={set("code")} /></Field>
          <Field label="Type"><Select value={form.kind} onChange={set("kind")}><option value="goods">Goods</option><option value="service">Service</option></Select></Field>
          <Field label="Unit" error={fieldError(save.error, "unit")}>
            <Select value={form.unit} onChange={set("unit")}>
              {!(units.data?.results ?? []).some((u) => u.abbreviation === form.unit) && <option value={form.unit}>{form.unit}</option>}
              {(units.data?.results ?? []).filter((u) => u.is_active).map((u) => <option key={u.id} value={u.abbreviation}>{u.name} ({u.abbreviation})</option>)}
            </Select>
          </Field>
          <Field label="Selling price" error={fieldError(save.error, "sale_price")} hint={editing === "new" ? "Blank: the cost plus the category's markup." : undefined}><Input inputMode="decimal" value={form.sale_price} onChange={set("sale_price")} /></Field>
        </div>
        {form.kind === "goods" && (
          <div className="grid grid-cols-2 items-end gap-3">
            <div className="space-y-1 pb-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.track_inventory} onChange={(e) => setForm((prev) => ({ ...prev, track_inventory: e.target.checked, made_to_order: e.target.checked ? false : prev.made_to_order }))} /> Track stock</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.made_to_order} onChange={(e) => setForm((prev) => ({ ...prev, made_to_order: e.target.checked, track_inventory: e.target.checked ? false : prev.track_inventory }))} /> Made when sold, from a recipe</label>
            </div>
            {form.made_to_order && <p className="pb-2 text-xs text-stone-500">For meals, drinks and the like: no stock of its own. Each sale takes its recipe&apos;s ingredients out of stock. Add the recipe in Manufacturing &gt; Recipes.</p>}
            {form.track_inventory && <Field label="Warn when stock falls to" error={fieldError(save.error, "reorder_level")}><Input inputMode="decimal" value={form.reorder_level} onChange={set("reorder_level")} /></Field>}
          </div>
        )}
        {form.kind === "goods" && form.track_inventory && (editing === "new" || Number((editing as Product | null)?.stock_on_hand ?? 0) === 0) && (
          <div className="space-y-2 rounded-md bg-stone-50 p-3">
            <p className="text-sm font-medium text-stone-800">Stock you already have</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Quantity on hand" error={fieldError(save.error, "opening_quantity")}><Input inputMode="decimal" value={form.opening_quantity} onChange={set("opening_quantity")} placeholder="0" /></Field>
              <Field label="Cost of each" hint="Blank: the cost price." error={fieldError(save.error, "opening_unit_cost")}><Input inputMode="decimal" value={form.opening_unit_cost} onChange={set("opening_unit_cost")} /></Field>
            </div>
            <p className="text-xs text-stone-500">Goes into the default warehouse as opening stock. After this, stock comes in when you receive goods on a purchase order (Purchasing &gt; Goods received), or through Inventory &gt; Adjustments.</p>
          </div>
        )}
        {form.kind === "goods" && form.track_inventory && editing !== "new" && Number((editing as Product | null)?.stock_on_hand ?? 0) !== 0 && (
          <p className="text-xs text-stone-500">In stock: {Number((editing as Product).stock_on_hand)}. To add or remove stock, receive goods on a purchase order or use Inventory &gt; Adjustments.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
          <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={form.online} onChange={(e) => setForm((prev) => ({ ...prev, online: e.target.checked }))} /> Sell online</label>
          {form.online && <Field label="Picture link (optional)" hint="A direct link to a photo (usually ending in .jpg or .png), for example from your website." error={fieldError(save.error, "image_url")}><Input type="url" value={form.image_url} onChange={set("image_url")} placeholder="https://" /></Field>}
        </div>
        {form.kind === "goods" && (
          <div className="space-y-2 rounded-md border border-stone-200 p-3">
            <div>
              <p className="text-sm font-medium text-stone-800">Other units</p>
              <p className="text-xs text-stone-500">Buy or sell it in bigger or smaller units, e.g. a carton of 24 {form.unit}. Stock is always kept in {form.unit}.</p>
            </div>
            {form.units.map((u, n) => (
              <div key={n} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                <Field label={n === 0 ? "Unit" : ""}>
                  <Select value={u.unit} onChange={(e) => setForm((prev) => ({ ...prev, units: prev.units.map((x, k) => (k === n ? { ...x, unit: e.target.value } : x)) }))}>
                    <option value="">Choose</option>
                    {(units.data?.results ?? []).filter((x) => x.is_active && x.abbreviation !== form.unit).map((x) => <option key={x.id} value={x.abbreviation}>{x.name} ({x.abbreviation})</option>)}
                  </Select>
                </Field>
                <Field label={n === 0 ? `Holds (${form.unit})` : ""}><Input inputMode="decimal" value={u.factor} placeholder="24" onChange={(e) => setForm((prev) => ({ ...prev, units: prev.units.map((x, k) => (k === n ? { ...x, factor: e.target.value } : x)) }))} /></Field>
                <Field label={n === 0 ? "Price (optional)" : ""}><Input inputMode="decimal" value={u.sale_price} placeholder={u.factor && form.sale_price ? String(Number(form.sale_price) * Number(u.factor)) : ""} onChange={(e) => setForm((prev) => ({ ...prev, units: prev.units.map((x, k) => (k === n ? { ...x, sale_price: e.target.value } : x)) }))} /></Field>
                <Button type="button" variant="ghost" className="px-2" onClick={() => setForm((prev) => ({ ...prev, units: prev.units.filter((_, k) => k !== n) }))}>Remove</Button>
              </div>
            ))}
            <Button type="button" variant="ghost" className="px-2 py-1" onClick={() => setForm((prev) => ({ ...prev, units: [...prev.units, { unit: "", factor: "", sale_price: "" }] }))}><Plus className="h-4 w-4" /> Add a unit</Button>
            {fieldError(save.error, "units") && <p className="text-sm text-red-600">{fieldError(save.error, "units")}</p>}
          </div>
        )}
        {fieldError(save.error, "made_to_order") && <p className="text-sm text-red-600">{fieldError(save.error, "made_to_order")}</p>}
        {fieldError(save.error, "track_inventory") && <p className="text-sm text-red-600">{fieldError(save.error, "track_inventory")}</p>}
        <Field label="Category" error={fieldError(save.error, "category_id")}>
          <Select value={form.category_id} onChange={set("category_id")}>
            <option value="">No category</option>
            {(categories.data?.results ?? []).filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{c.parent_name ? `${c.parent_name} › ` : ""}{c.name}</option>)}
          </Select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="VAT" error={fieldError(save.error, "tax_rate_id")}>
            <Select value={form.tax_rate_id} onChange={set("tax_rate_id")}>
              <option value="">Workspace default</option>
              {(rates.data?.results ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </Field>
          <Field label="Cost price" error={fieldError(save.error, "cost_price")} hint="Used for margins; stock costing comes with Inventory."><Input inputMode="decimal" value={form.cost_price} onChange={set("cost_price")} /></Field>
        </div>
        <Field label="Income account" error={fieldError(save.error, "income_account_id")} hint={`Blank: ${form.kind === "service" ? "Service income" : "Sales"}.`}>
          <Select value={form.income_account_id} onChange={set("income_account_id")}>
            <option value="">Default</option>
            <AccountOptions accounts={(accounts.data ?? []).filter((a) => a.account_type === "income")} />
          </Select>
        </Field>
        <Field label="Description" error={fieldError(save.error, "description")}><Textarea value={form.description} onChange={set("description")} /></Field>
        {current && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} /> Active</label>}
        <FormError error={save.error} />
        <div className="flex justify-between gap-2">
          {current ? <Button type="button" variant="ghost" className="text-red-600" loading={remove.isPending} onClick={() => void ask("Delete this product?").then((ok) => ok && remove.mutate(current.id))}>Delete</Button> : <span />}
          <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={onDone}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
        </div>
      </form>
    </Modal>  );
}
