"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Search, Tags } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td, Textarea } from "@/components/ui";
import { AccountOptions, useAccounts } from "@/lib/api/accounting";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { useCategories, useUnits, useVatRates } from "@/lib/api/sales";
import type { Product } from "@/lib/api/types";
import { fmt } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

type Kind = "goods" | "service";
const EMPTY = { code: "", name: "", kind: "goods" as Kind, category_id: "", track_inventory: true, reorder_level: "0", description: "", unit: "pcs", sale_price: "", cost_price: "0", tax_rate_id: "", income_account_id: "", is_active: true };

export default function ProductsPage() {
  const { slug, can, context } = useWorkspace();
  const manage = can("products.manage");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [form, setForm] = useState(EMPTY);
  const rates = useVatRates(slug);
  const accounts = useAccounts(slug);
  const categories = useCategories(slug);
  const units = useUnits(slug);
  const [category, setCategory] = useState("");
  const list = useQuery({
    queryKey: ["products", slug, "all", search, category],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/products/", { params: { path: { workspace: slug }, query: { search: search || undefined, category: category || undefined, page_size: 200 } } })),
  });
  const save = useMutation({
    mutationFn: async () => {
      const body = { ...form, track_inventory: form.kind === "goods" && form.track_inventory, category_id: form.category_id || null, sale_price: form.sale_price || "0", tax_rate_id: form.tax_rate_id || null, income_account_id: form.income_account_id || null };
      if (editing === "new") return unwrap(await api.POST("/api/v1/w/{workspace}/products/", { ...wsPath(slug), body }));
      const id = (editing as Product).id;
      return unwrap(await api.PATCH("/api/v1/w/{workspace}/products/{id}/", { params: { path: { workspace: slug, id } }, body }));
    },
    onSuccess: () => { toast.success("Product saved"); setEditing(null); },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await api.DELETE("/api/v1/w/{workspace}/products/{id}/", { params: { path: { workspace: slug, id } } })),
    onSuccess: () => { toast.success("Product deleted"); setEditing(null); },
    onError: (e) => toast.error(e.message),
  });
  function open(p: Product | "new") {
    save.reset();
    const defaultRate = rates.data?.results.find((r) => r.is_default)?.id ?? "";
    setForm(p === "new" ? { ...EMPTY, tax_rate_id: defaultRate } : {
      code: p.code ?? "", name: p.name, kind: (p.kind ?? "goods") as Kind, category_id: p.category_id ?? "", track_inventory: p.track_inventory ?? false, reorder_level: String(Number(p.reorder_level ?? 0)), description: p.description ?? "", unit: p.unit ?? "pcs",
      sale_price: String(Number(p.sale_price ?? 0)), cost_price: String(Number(p.cost_price ?? 0)), tax_rate_id: p.tax_rate_id ?? "",
      income_account_id: p.income_account_id ?? "", is_active: p.is_active ?? true,
    });
    setEditing(p);
  }
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const rows = list.data?.results ?? [];
  const current = editing !== "new" && editing !== null ? editing : null;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Products and services"
        description="What you sell, with its price and VAT. Lines on quotations, invoices and cash sales fill in from here."
        guide="products"
        actions={
          <div className="flex gap-2">
            <Link href={`/w/${slug}/sales/catalogue`}><Button variant="secondary"><Tags className="h-4 w-4" /> Categories and units</Button></Link>
            {manage && <Button onClick={() => open("new")}><Plus className="h-4 w-4" /> New product</Button>}
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <Input className="pl-9" placeholder="Search name or code" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-56">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {(categories.data?.results ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title={search ? "No products match" : "No products yet"} />
        ) : (
          <Table head={["Code", "Name", "Category", "In stock", `Price (${context.workspace.currency})`, "VAT"]}>
            {rows.map((p) => (
              <tr key={p.id} className={manage ? "cursor-pointer hover:bg-stone-50" : ""} onClick={() => manage && open(p)}>
                <Td className="font-mono text-xs">{p.code || "-"}</Td>
                <Td className="font-medium">{p.name} {!p.is_active && <Badge>Inactive</Badge>}</Td>
                <Td className="text-stone-600">{p.category_name ?? "-"}</Td>
                <Td className="text-right font-mono">{p.stock_on_hand != null ? `${Number(p.stock_on_hand)} ${p.unit}` : "-"}</Td>
                <Td className="text-right font-mono">{fmt(p.sale_price)}</Td>
                <Td className="text-stone-500">{p.tax_rate_name ?? "Workspace default"}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={editing !== null} title={current ? current.name : "New product or service"} onClose={() => setEditing(null)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><Field label="Name" error={fieldError(save.error, "name")}><Input required value={form.name} onChange={set("name")} /></Field></div>
            <Field label="Code (SKU)" error={fieldError(save.error, "code")}><Input value={form.code} onChange={set("code")} /></Field>
            <Field label="Type"><Select value={form.kind} onChange={set("kind")}><option value="goods">Goods</option><option value="service">Service</option></Select></Field>
            <Field label="Unit" error={fieldError(save.error, "unit")}>
              <Select value={form.unit} onChange={set("unit")}>
                {!(units.data?.results ?? []).some((u) => u.abbreviation === form.unit) && <option value={form.unit}>{form.unit}</option>}
                {(units.data?.results ?? []).filter((u) => u.is_active).map((u) => <option key={u.id} value={u.abbreviation}>{u.name} ({u.abbreviation})</option>)}
              </Select>
            </Field>
            <Field label="Selling price" error={fieldError(save.error, "sale_price")}><Input required inputMode="decimal" value={form.sale_price} onChange={set("sale_price")} /></Field>
          </div>
          {form.kind === "goods" && (
            <div className="grid grid-cols-2 items-end gap-3">
              <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={form.track_inventory} onChange={(e) => setForm((prev) => ({ ...prev, track_inventory: e.target.checked }))} /> Track stock</label>
              {form.track_inventory && <Field label="Warn when stock falls to" error={fieldError(save.error, "reorder_level")}><Input inputMode="decimal" value={form.reorder_level} onChange={set("reorder_level")} /></Field>}
            </div>
          )}
          {fieldError(save.error, "track_inventory") && <p className="text-sm text-red-600">{fieldError(save.error, "track_inventory")}</p>}
          <Field label="Category" error={fieldError(save.error, "category_id")}>
            <Select value={form.category_id} onChange={set("category_id")}>
              <option value="">No category</option>
              {(categories.data?.results ?? []).filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{c.parent_name ? `${c.parent_name} › ` : ""}{c.name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
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
            {current ? <Button type="button" variant="ghost" className="text-red-600" loading={remove.isPending} onClick={() => confirm("Delete this product?") && remove.mutate(current.id)}>Delete</Button> : <span />}
            <div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
