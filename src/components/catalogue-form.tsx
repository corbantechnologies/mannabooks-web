"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { api, unwrap } from "@/lib/api/client";
import { useCategories, useCustomers, usePriceLists, useProducts } from "@/lib/api/sales";
import type { Catalogue } from "@/lib/api/types";
import { useWorkspace, wsPath } from "@/lib/workspace";

import { Button, Card, Field, FormError, Input, Select, Textarea } from "./ui";

type Form = {
  name: string; intro: string; customer_id: string; price_list_id: string; category_ids: string[]; product_ids: string[];
  excluded_product_ids: string[]; quote_mode: "auto" | "review"; show_prices: boolean; show_stock: boolean; expires_on: string; is_active: boolean;
};

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

/** Make or change a catalogue: whole categories (they keep up with new products), hand-picked products, or both. */
export function CatalogueForm({ existing, onDone }: { existing?: Catalogue; onDone?: () => void }) {
  const { slug } = useWorkspace();
  const router = useRouter();
  const qc = useQueryClient();
  const customers = useCustomers(slug);
  const priceLists = usePriceLists(slug);
  const categories = useCategories(slug);
  const products = useProducts(slug);
  const [f, setF] = useState<Form>({
    name: existing?.name ?? "", intro: existing?.intro ?? "", customer_id: existing?.customer_id ?? "", price_list_id: existing?.price_list_id ?? "",
    category_ids: existing?.category_ids ?? [], product_ids: existing?.product_ids ?? [], excluded_product_ids: existing?.excluded_product_ids ?? [],
    quote_mode: (existing?.quote_mode as Form["quote_mode"]) ?? "auto", show_prices: existing?.show_prices ?? true, show_stock: existing?.show_stock ?? false,
    expires_on: existing?.expires_on ?? "", is_active: existing?.is_active ?? true,
  });
  const [search, setSearch] = useState("");
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  const cats = useMemo(() => categories.data?.results ?? [], [categories.data]);
  const all = useMemo(() => products.data?.results ?? [], [products.data]);
  // a category brings its sub-categories with it
  const chosenCats = useMemo(() => {
    const ids = new Set(f.category_ids);
    let grew = true;
    while (grew) {
      grew = false;
      for (const c of cats) if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) { ids.add(c.id); grew = true; }
    }
    return ids;
  }, [f.category_ids, cats]);
  type P = (typeof all)[number];
  const fromCategory = (p: P) => Boolean(p.category_id && chosenCats.has(p.category_id));
  const included = (p: P) => (fromCategory(p) || f.product_ids.includes(p.id)) && !f.excluded_product_ids.includes(p.id);
  const count = all.filter(included).length;
  const shown = all.filter((p) => !search || `${p.name} ${p.code} ${p.category_name ?? ""}`.toLowerCase().includes(search.toLowerCase()));

  function pick(p: P) {
    if (fromCategory(p)) set("excluded_product_ids", toggle(f.excluded_product_ids, p.id));
    else set("product_ids", toggle(f.product_ids, p.id));
  }

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        ...f, customer_id: f.customer_id || null, price_list_id: f.price_list_id || null, expires_on: f.expires_on || null,
        quote_mode: f.show_prices ? f.quote_mode : ("review" as const),
        // keep only the exclusions that still matter
        excluded_product_ids: f.excluded_product_ids.filter((id) => { const p = all.find((x) => x.id === id); return !p || fromCategory(p); }),
      };
      return existing
        ? unwrap(await api.PATCH("/api/v1/w/{workspace}/catalogues/{id}/", { params: { path: { workspace: slug, id: existing.id } }, body }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/catalogues/", { ...wsPath(slug), body }));
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["catalogues", slug] });
      qc.invalidateQueries({ queryKey: ["catalogue", slug, c.id] });
      toast.success(existing ? "Catalogue saved" : "Catalogue made. Share it with your client.");
      if (onDone) onDone(); else router.push(`/w/${slug}/sales/catalogues/${c.id}?share=1`);
    },
  });

  return (
    <form className="grid gap-4 lg:grid-cols-[1fr_24rem]" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <Card className="order-2 p-4 lg:order-1">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-semibold">What&apos;s in it</h2>
            <p className="text-sm text-stone-600">Tick whole categories (new products in them join by themselves), or single products. Untick a product to leave it out of its category.</p>
          </div>
          <span className="text-sm font-medium text-brand-700">{count} product{count === 1 ? "" : "s"}</span>
        </div>
        {cats.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {cats.map((c) => (
              <label key={c.id} className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${f.category_ids.includes(c.id) ? "border-brand-600 bg-brand-50 text-brand-800" : chosenCats.has(c.id) ? "border-brand-200 bg-brand-50/50 text-brand-700" : "border-stone-200 text-stone-700 hover:bg-stone-50"}`}>
                <input type="checkbox" className="sr-only" checked={f.category_ids.includes(c.id)} onChange={() => set("category_ids", toggle(f.category_ids, c.id))} />
                {c.parent_name ? `${c.parent_name} › ` : ""}{c.name}
              </label>
            ))}
          </div>
        )}
        <div className="relative mb-2 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <Input className="pl-9" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <ul className="max-h-[28rem] divide-y divide-stone-100 overflow-y-auto rounded-md border border-stone-200">
          {shown.map((p) => (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-stone-50">
                <input type="checkbox" checked={included(p)} onChange={() => pick(p)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{p.name}</span>
                  <span className="block text-xs text-stone-500">{[p.code, p.category_name].filter(Boolean).join(" · ")}{fromCategory(p) ? " · from its category" : ""}</span>
                </span>
              </label>
            </li>
          ))}
          {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-stone-500">No products match.</li>}
        </ul>
      </Card>
      <Card className="order-1 h-fit space-y-4 p-4 lg:order-2">
        <Field label="Name"><Input required value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Laptops for Acme Ltd" /></Field>
        <Field label="Message at the top (optional)"><Textarea rows={2} value={f.intro} onChange={(e) => set("intro", e.target.value)} placeholder="Prices valid this month. Free delivery within Nairobi." /></Field>
        <Field label="For">
          <Select value={f.customer_id} onChange={(e) => set("customer_id", e.target.value)}>
            <option value="">Anyone with the link</option>
            {(customers.data?.results ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Prices">
          <Select value={f.price_list_id} onChange={(e) => set("price_list_id", e.target.value)}>
            <option value="">{f.customer_id ? "The customer's price list" : "Normal prices"}</option>
            {(priceLists.data?.results ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        </Field>
        <Field label="When the client sends their picks">
          <Select value={f.show_prices ? f.quote_mode : "review"} disabled={!f.show_prices} onChange={(e) => set("quote_mode", e.target.value as Form["quote_mode"])}>
            <option value="auto">Send them the quotation at once</option>
            <option value="review">Save it as a draft for us to review</option>
          </Select>
        </Field>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={f.show_prices} onChange={(e) => set("show_prices", e.target.checked)} />
          <span>Show prices<span className="block text-xs text-stone-500">Off: prices on request, and you review every quote first.</span></span></label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={f.show_stock} onChange={(e) => set("show_stock", e.target.checked)} />
          <span>Show In stock or Out of stock<span className="block text-xs text-stone-500">Never the actual numbers.</span></span></label>
        <Field label="Closes on (optional)"><Input type="date" value={f.expires_on} onChange={(e) => set("expires_on", e.target.value)} /></Field>
        {existing && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={(e) => set("is_active", e.target.checked)} /> Open (the link works)</label>}
        <FormError error={save.error} />
        <div className="flex justify-end gap-2">
          {onDone && <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>}
          <Button type="submit" loading={save.isPending} disabled={!count}>{existing ? "Save" : "Make catalogue"}</Button>
        </div>
      </Card>
    </form>
  );
}
