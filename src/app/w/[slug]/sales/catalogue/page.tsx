"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, Field, FormError, Input, Modal, PageHeader, Select, Table, Td } from "@/components/ui";
import { AccountOptions, useAccounts } from "@/lib/api/accounting";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { useCategories, useUnits, useVatRates } from "@/lib/api/sales";
import type { ProductCategory, Unit } from "@/lib/api/types";
import { useWorkspace, wsPath } from "@/lib/workspace";
import { ask } from "@/components/confirm";

export default function CataloguePage() {
  const { slug } = useWorkspace();
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/sales/products`} className="text-sm text-stone-500 hover:underline">&larr; Products</Link>
      <PageHeader title="Categories and units" description="Group products into categories, and choose the units you sell in." guide="catalogue" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Categories />
        <Units />
      </div>
    </div>
  );
}

function Categories() {
  const { slug, can } = useWorkspace();
  const manage = can("products.manage");
  const list = useCategories(slug);
  const [editing, setEditing] = useState<ProductCategory | "new" | null>(null);
  const blank = { name: "", parent_id: "", description: "", tax_rate_id: "", income_account_id: "", markup_percent: "", is_active: true };
  const [form, setForm] = useState(blank);
  const rates = useVatRates(slug);
  const accounts = useAccounts(slug);
  const save = useMutation({
    mutationFn: async () => {
      const body = { ...form, parent_id: form.parent_id || null, tax_rate_id: form.tax_rate_id || null, income_account_id: form.income_account_id || null,
        markup_percent: form.markup_percent || null };
      if (editing === "new") return unwrap(await api.POST("/api/v1/w/{workspace}/product-categories/", { ...wsPath(slug), body }));
      return unwrap(await api.PATCH("/api/v1/w/{workspace}/product-categories/{id}/", { params: { path: { workspace: slug, id: (editing as ProductCategory).id } }, body }));
    },
    onSuccess: () => { toast.success("Category saved"); setEditing(null); },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await api.DELETE("/api/v1/w/{workspace}/product-categories/{id}/", { params: { path: { workspace: slug, id } } })),
    onSuccess: () => { toast.success("Category deleted"); setEditing(null); },
    onError: (e) => toast.error(e.message),
  });
  function open(c: ProductCategory | "new") {
    save.reset();
    setForm(c === "new" ? blank : {
      name: c.name, parent_id: c.parent_id ?? "", description: c.description ?? "", tax_rate_id: c.tax_rate_id ?? "", income_account_id: c.income_account_id ?? "",
      markup_percent: c.markup_percent != null ? String(Number(c.markup_percent)) : "", is_active: c.is_active ?? true,
    });
    setEditing(c);
  }
  const rows = list.data?.results ?? [];
  const current = editing !== "new" && editing !== null ? editing : null;
  return (
    <Card>
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-sm font-semibold">Categories</h2>
        {manage && <Button variant="ghost" className="px-2 py-1" onClick={() => open("new")}><Plus className="h-4 w-4" /> Add</Button>}
      </div>
      {rows.length === 0 ? <EmptyState title="No categories yet">For example Cement, Paint, Plumbing.</EmptyState> : (
        <Table head={["Name", "Inside", "Defaults", "Products"]}>
          {rows.map((c) => (
            <tr key={c.id} className={manage ? "cursor-pointer hover:bg-stone-50" : ""} onClick={() => manage && open(c)}>
              <Td className="font-medium">{c.name} {!c.is_active && <Badge>Inactive</Badge>}</Td>
              <Td className="text-stone-500">{c.parent_name ?? "-"}</Td>
              <Td className="text-xs text-stone-500">{[c.tax_rate_name, c.markup_percent != null ? `+${Number(c.markup_percent)}%` : null].filter(Boolean).join(", ") || "-"}</Td>
              <Td className="text-right">{c.product_count}</Td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={editing !== null} title={current ? current.name : "New category"} onClose={() => setEditing(null)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <Field label="Name" error={fieldError(save.error, "name")}><Input required value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} /></Field>
          <Field label="Inside category" error={fieldError(save.error, "parent_id")}>
            <Select value={form.parent_id} onChange={(e) => setForm((prev) => ({ ...prev, parent_id: e.target.value }))}>
              <option value="">None (top level)</option>
              {rows.filter((c) => c.id !== current?.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <div className="space-y-3 rounded-md bg-stone-50 p-3">
            <p className="text-xs text-stone-600">Defaults for <strong>new</strong> products in this category (and its sub-categories). Blank: the parent category&apos;s, then the workspace&apos;s.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="VAT rate" error={fieldError(save.error, "tax_rate_id")}>
                <Select value={form.tax_rate_id} onChange={(e) => setForm((prev) => ({ ...prev, tax_rate_id: e.target.value }))}>
                  <option value="">Not set</option>
                  {(rates.data?.results ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </Select>
              </Field>
              <Field label="Markup on cost (%)" hint="Suggests the price: cost 100 at 40% is 140." error={fieldError(save.error, "markup_percent")}>
                <Input inputMode="decimal" value={form.markup_percent} onChange={(e) => setForm((prev) => ({ ...prev, markup_percent: e.target.value }))} placeholder="40" />
              </Field>
            </div>
            <Field label="Income account" error={fieldError(save.error, "income_account_id")}>
              <Select value={form.income_account_id} onChange={(e) => setForm((prev) => ({ ...prev, income_account_id: e.target.value }))}>
                <option value="">Not set (Sales)</option>
                <AccountOptions accounts={(accounts.data ?? []).filter((a) => a.account_type === "income")} />
              </Select>
            </Field>
          </div>
          {current && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} /> Active</label>}
          <FormError error={save.error} />
          <div className="flex justify-between gap-2">
            {current ? <Button type="button" variant="ghost" className="text-red-600" loading={remove.isPending} onClick={() => void ask("Delete this category?").then((ok) => ok && remove.mutate(current.id))}>Delete</Button> : <span />}
            <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
          </div>
        </form>
      </Modal>
    </Card>
  );
}

function Units() {
  const { slug, can } = useWorkspace();
  const manage = can("products.manage");
  const list = useUnits(slug);
  const [editing, setEditing] = useState<Unit | "new" | null>(null);
  const [form, setForm] = useState({ name: "", abbreviation: "", etims_code: "", is_active: true });
  const save = useMutation({
    mutationFn: async () => {
      if (editing === "new") return unwrap(await api.POST("/api/v1/w/{workspace}/units/", { ...wsPath(slug), body: form }));
      return unwrap(await api.PATCH("/api/v1/w/{workspace}/units/{id}/", { params: { path: { workspace: slug, id: (editing as Unit).id } }, body: form }));
    },
    onSuccess: () => { toast.success("Unit saved"); setEditing(null); },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await api.DELETE("/api/v1/w/{workspace}/units/{id}/", { params: { path: { workspace: slug, id } } })),
    onSuccess: () => { toast.success("Unit deleted"); setEditing(null); },
    onError: (e) => toast.error(e.message),
  });
  function open(u: Unit | "new") {
    save.reset();
    setForm(u === "new" ? { name: "", abbreviation: "", etims_code: "", is_active: true } : { name: u.name, abbreviation: u.abbreviation, etims_code: u.etims_code ?? "", is_active: u.is_active ?? true });
    setEditing(u);
  }
  const rows = list.data?.results ?? [];
  const current = editing !== "new" && editing !== null ? editing : null;
  return (
    <Card>
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-sm font-semibold">Units</h2>
        {manage && <Button variant="ghost" className="px-2 py-1" onClick={() => open("new")}><Plus className="h-4 w-4" /> Add</Button>}
      </div>
      <Table head={["Unit", "Short", "eTIMS code"]}>
        {rows.map((u) => (
          <tr key={u.id} className={manage ? "cursor-pointer hover:bg-stone-50" : ""} onClick={() => manage && open(u)}>
            <Td>{u.name} {!u.is_active && <Badge>Inactive</Badge>}</Td>
            <Td className="font-mono text-xs">{u.abbreviation}</Td>
            <Td className="font-mono text-xs">{u.etims_code || "-"}</Td>
          </tr>
        ))}
      </Table>
      <Modal open={editing !== null} title={current ? current.name : "New unit"} onClose={() => setEditing(null)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" error={fieldError(save.error, "name")}><Input required value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Bag" /></Field>
            <Field label="Short form" error={fieldError(save.error, "abbreviation")}><Input required value={form.abbreviation} onChange={(e) => setForm((prev) => ({ ...prev, abbreviation: e.target.value }))} placeholder="bag" /></Field>
          </div>
          <Field label="KRA eTIMS unit code" error={fieldError(save.error, "etims_code")} hint="From KRA's code list; used once eTIMS is switched on.">
            <Input value={form.etims_code} onChange={(e) => setForm((prev) => ({ ...prev, etims_code: e.target.value }))} />
          </Field>
          {current && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} /> Active</label>}
          <FormError error={save.error} />
          <div className="flex justify-between gap-2">
            {current ? <Button type="button" variant="ghost" className="text-red-600" loading={remove.isPending} onClick={() => void ask("Delete this unit?").then((ok) => ok && remove.mutate(current.id))}>Delete</Button> : <span />}
            <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
