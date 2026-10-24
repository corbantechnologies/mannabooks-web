"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Plus, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, FormError, PageHeader, Select } from "@/components/ui";
import { ApiError, api, unwrap } from "@/lib/api/client";
import { useCategories, useUnits, useVatRates } from "@/lib/api/sales";
import { useWorkspace, wsPath } from "@/lib/workspace";

type Row = {
  name: string; code: string; kind: "goods" | "service"; category_id: string; unit: string; sale_price: string; cost_price: string;
  tax_rate_id: string; track_inventory: boolean; opening_quantity: string;
};
type RowErrors = Record<string, string[]>;

const MAX = 50;
const blank = (): Row => ({ name: "", code: "", kind: "goods", category_id: "", unit: "pcs", sale_price: "", cost_price: "", tax_rate_id: "", track_inventory: false, opening_quantity: "" });
const cell = "w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

/** Many products at once, typed (or pasted from Excel) in rows. Saved together: if a row is wrong, nothing is saved. */
export default function BulkProductsPage() {
  const { slug } = useWorkspace();
  const router = useRouter();
  const qc = useQueryClient();
  const categories = useCategories(slug);
  const units = useUnits(slug);
  const vat = useVatRates(slug);
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: 10 }, blank));
  const [errors, setErrors] = useState<Record<number, RowErrors>>({});

  const filled = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.name.trim());
  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addRows = (n: number) => setRows((rs) => [...rs, ...Array.from({ length: Math.min(n, MAX - rs.length) }, blank)]);
  const forAll = (patch: Partial<Row>) => setRows((rs) => rs.map((r) => ({ ...r, ...patch })));

  /** Pasting several lines (from Excel: name, code, selling price, cost price) fills rows from here down. */
  function paste(i: number, e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\n") && !text.includes("\t")) return;
    e.preventDefault();
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim()).slice(0, MAX - i);
    setRows((rs) => {
      const next = [...rs];
      while (next.length < Math.min(i + lines.length, MAX)) next.push(blank());
      lines.forEach((line, k) => {
        const [name = "", code = "", sale = "", cost = ""] = line.split("\t").map((x) => x.trim());
        const money = (v: string) => v.replace(/[^0-9.]/g, "");
        next[i + k] = { ...next[i + k], name, code, sale_price: money(sale), cost_price: money(cost) };
      });
      return next;
    });
    toast.success(`${lines.length} rows pasted`);
  }

  const save = useMutation({
    mutationFn: async () => {
      setErrors({});
      const products = filled.map(({ r }) => ({
        name: r.name.trim(), code: r.code.trim(), kind: r.kind, category_id: r.category_id || null, unit: r.unit.trim() || "pcs",
        sale_price: r.sale_price || "0", cost_price: r.cost_price || "0", tax_rate_id: r.tax_rate_id || null,
        track_inventory: r.kind === "goods" && r.track_inventory,
        ...(r.kind === "goods" && r.track_inventory && r.opening_quantity ? { opening_quantity: r.opening_quantity } : {}),
      }));
      return unwrap(await api.POST("/api/v1/w/{workspace}/products/bulk/", { ...wsPath(slug), body: { products } as never }));
    },
    onSuccess: (made) => {
      qc.invalidateQueries({ queryKey: ["products", slug] });
      toast.success(`${made.length} products added`);
      router.push(`/w/${slug}/sales/products`);
    },
    onError: (e) => {
      const byRow = (e instanceof ApiError ? (e.fieldErrors as unknown as { rows?: Record<string, RowErrors> }).rows : undefined) ?? {};
      const mapped: Record<number, RowErrors> = {};
      for (const [n, errs] of Object.entries(byRow)) mapped[filled[Number(n)]?.i ?? -1] = errs;
      setErrors(mapped);
    },
  });

  const cats = categories.data?.results ?? [];
  const rates = vat.data?.results ?? [];
  const problems = Object.keys(errors).length;
  const head = ["#", "Name *", "Code", "Type", "Category", "Unit", "Selling price", "Cost price", "VAT", "Track stock", "Opening stock", ""];

  return (
    <div className="w-full">
      <Link href={`/w/${slug}/sales/products`} className="text-sm text-stone-500 hover:underline">&larr; Products</Link>
      <PageHeader title="Add many products" guide="products"
        description="Type one product per row, or paste rows from Excel into a Name box (columns: name, code, selling price, cost price). Rows without a name are left out."
        actions={<Link href={`/w/${slug}/data?kind=products`}><Button variant="secondary"><Upload className="h-4 w-4" /> Import a spreadsheet instead</Button></Link>} />

      <Card className="mb-3 flex flex-wrap items-end gap-3 p-3">
        <span className="text-sm font-medium text-stone-700">Set for every row:</span>
        <label className="text-xs text-stone-500">Category
          <Select className="mt-0.5 w-48" value="" onChange={(e) => e.target.value && forAll({ category_id: e.target.value === "-" ? "" : e.target.value })}>
            <option value="">Choose…</option><option value="-">No category</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </label>
        <label className="text-xs text-stone-500">VAT
          <Select className="mt-0.5 w-44" value="" onChange={(e) => e.target.value && forAll({ tax_rate_id: e.target.value === "-" ? "" : e.target.value })}>
            <option value="">Choose…</option><option value="-">Category&apos;s or default</option>{rates.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </label>
        <label className="text-xs text-stone-500">Type
          <Select className="mt-0.5 w-32" value="" onChange={(e) => e.target.value && forAll({ kind: e.target.value as Row["kind"], ...(e.target.value === "service" ? { track_inventory: false } : {}) })}>
            <option value="">Choose…</option><option value="goods">Goods</option><option value="service">Service</option>
          </Select>
        </label>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[72rem] border-collapse text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>{head.map((h) => <th key={h} className="whitespace-nowrap px-2 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const err = errors[i];
              const bad = (f: string) => Boolean(err?.[f]);
              return (
                <tr key={i} className={clsx("border-b border-stone-100 align-top", err && "bg-red-50/60")}>
                  <td className="px-2 py-2 text-xs text-stone-400">{i + 1}</td>
                  <td className="w-64 px-1 py-1">
                    <input className={clsx(cell, bad("name") && "border-red-500")} value={r.name} placeholder={i === 0 ? "e.g. HP ProBook 450 G9" : ""}
                      onChange={(e) => set(i, { name: e.target.value })} onPaste={(e) => paste(i, e)} aria-label={`Row ${i + 1} name`} />
                    {err && <p className="mt-1 text-xs text-red-700">{Object.entries(err).map(([f, m]) => `${f === "non_field_errors" ? "" : `${f.replace(/_id$/, "").replace(/_/g, " ")}: `}${m.join(" ")}`).join(" · ")}</p>}
                  </td>
                  <td className="w-28 px-1 py-1"><input className={clsx(cell, bad("code") && "border-red-500")} value={r.code} placeholder="Auto" onChange={(e) => set(i, { code: e.target.value })} aria-label={`Row ${i + 1} code`} /></td>
                  <td className="w-28 px-1 py-1">
                    <select className={cell} value={r.kind} onChange={(e) => set(i, { kind: e.target.value as Row["kind"], ...(e.target.value === "service" ? { track_inventory: false } : {}) })} aria-label={`Row ${i + 1} type`}>
                      <option value="goods">Goods</option><option value="service">Service</option>
                    </select>
                  </td>
                  <td className="w-40 px-1 py-1">
                    <select className={cell} value={r.category_id} onChange={(e) => set(i, { category_id: e.target.value })} aria-label={`Row ${i + 1} category`}>
                      <option value="">None</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </td>
                  <td className="w-20 px-1 py-1">
                    <input className={cell} list="bulk-units" value={r.unit} onChange={(e) => set(i, { unit: e.target.value })} aria-label={`Row ${i + 1} unit`} />
                  </td>
                  <td className="w-32 px-1 py-1"><input className={clsx(cell, "text-right", bad("sale_price") && "border-red-500")} inputMode="decimal" value={r.sale_price} placeholder="0.00" onChange={(e) => set(i, { sale_price: e.target.value })} aria-label={`Row ${i + 1} selling price`} /></td>
                  <td className="w-32 px-1 py-1"><input className={clsx(cell, "text-right", bad("cost_price") && "border-red-500")} inputMode="decimal" value={r.cost_price} placeholder="0.00" onChange={(e) => set(i, { cost_price: e.target.value })} aria-label={`Row ${i + 1} cost price`} /></td>
                  <td className="w-36 px-1 py-1">
                    <select className={cell} value={r.tax_rate_id} onChange={(e) => set(i, { tax_rate_id: e.target.value })} aria-label={`Row ${i + 1} VAT`}>
                      <option value="">Category&apos;s or default</option>{rates.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <input type="checkbox" disabled={r.kind === "service"} checked={r.track_inventory} onChange={(e) => set(i, { track_inventory: e.target.checked })} aria-label={`Row ${i + 1} track stock`} />
                  </td>
                  <td className="w-24 px-1 py-1">
                    <input className={clsx(cell, "text-right")} inputMode="decimal" disabled={!r.track_inventory} value={r.opening_quantity} placeholder={r.track_inventory ? "0" : ""}
                      onChange={(e) => set(i, { opening_quantity: e.target.value })} aria-label={`Row ${i + 1} opening stock`} />
                  </td>
                  <td className="px-1 py-2">
                    <button type="button" className="text-stone-400 hover:text-red-600" aria-label={`Remove row ${i + 1}`}
                      onClick={() => { setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : [blank()])); setErrors({}); }}><X className="h-4 w-4" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <datalist id="bulk-units">{(units.data?.results ?? []).map((u) => <option key={u.id} value={u.abbreviation}>{u.name}</option>)}</datalist>
      </Card>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" disabled={rows.length >= MAX} onClick={() => addRows(10)}><Plus className="h-4 w-4" /> Add 10 rows</Button>
        <div className="flex flex-wrap items-center gap-3">
          {problems > 0 && <span className="text-sm text-red-700">{problems} row{problems === 1 ? "" : "s"} to fix. Nothing was saved.</span>}
          <span className="text-sm text-stone-500">{filled.length} product{filled.length === 1 ? "" : "s"} to add</span>
          <Button disabled={!filled.length} loading={save.isPending} onClick={() => save.mutate()}>Save {filled.length || ""} products</Button>
        </div>
      </div>
      {problems === 0 && <div className="mt-2"><FormError error={save.error} /></div>}
      <p className="mt-4 text-xs text-stone-500">Up to {MAX} at a time. A blank code gets the next number. A product in a category takes the category&apos;s VAT, income account and markup unless you set them. Opening stock goes into your default warehouse at the cost price.</p>
    </div>
  );
}
