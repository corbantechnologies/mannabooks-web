"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { api, fieldError, unwrap } from "@/lib/api/client";
import { useStockProducts } from "@/lib/api/purchasing";
import type { BillOfMaterials } from "@/lib/api/types";
import { fmt } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

import { StockRow, StockRowsEditor } from "./stock-lines";
import { Button, Card, Field, FormError, Input, Select, Table, Td, Textarea } from "./ui";

export function RecipeForm({ existing }: { existing?: BillOfMaterials }) {
  const { slug } = useWorkspace();
  const router = useRouter();
  const products = useStockProducts(slug);
  const madeToOrder = useQuery({
    queryKey: ["products", slug, "made-to-order"],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/products/", { params: { path: { workspace: slug }, query: { made_to_order: true, is_active: true, page_size: 200 } } })),
  });
  const outputs = [...(products.data?.results ?? []), ...(madeToOrder.data?.results ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const [head, setHead] = useState({ product_id: existing?.product_id ?? "", name: existing?.name ?? "", output_quantity: String(Number(existing?.output_quantity ?? 1)), notes: existing?.notes ?? "", is_active: existing?.is_active ?? true });
  const [rows, setRows] = useState<StockRow[]>(existing?.lines.map((l) => ({ product_id: l.component_id, quantity: String(Number(l.quantity)) })) ?? [{ product_id: "", quantity: "1" }]);
  const save = useMutation({
    mutationFn: async () => {
      const body = { ...head, lines: rows.filter((r) => r.product_id).map((r) => ({ component_id: r.product_id, quantity: r.quantity })) };
      return existing
        ? unwrap(await api.PATCH("/api/v1/w/{workspace}/bills-of-materials/{id}/", { params: { path: { workspace: slug, id: existing.id } }, body: body as never }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/bills-of-materials/", { ...wsPath(slug), body: body as never }));
    },
    onSuccess: (b) => { toast.success("Recipe saved"); router.push(`/w/${slug}/manufacturing/recipes/${b.id}`); },
  });
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <Card className="grid gap-3 p-4 sm:grid-cols-3">
        <Field label="Product made" error={fieldError(save.error, "product_id")}><Select required value={head.product_id} onChange={(e) => setHead((p) => ({ ...p, product_id: e.target.value }))}><option value="">Choose</option>{outputs.map((p) => <option key={p.id} value={p.id}>{p.name}{p.made_to_order ? " (made when sold)" : ""}</option>)}</Select></Field>
        <Field label="Recipe makes" hint="How many of the product these components make." error={fieldError(save.error, "output_quantity")}><Input inputMode="decimal" value={head.output_quantity} onChange={(e) => setHead((p) => ({ ...p, output_quantity: e.target.value }))} /></Field>
        <Field label="Name (optional)"><Input value={head.name} onChange={(e) => setHead((p) => ({ ...p, name: e.target.value }))} /></Field>
      </Card>
      <StockRowsEditor slug={slug} rows={rows} setRows={setRows} qtyHint="Qty used" />
      {existing && <RecipeCost bom={existing} />}
      <Field label="Method or notes"><Textarea rows={2} value={head.notes} onChange={(e) => setHead((p) => ({ ...p, notes: e.target.value }))} /></Field>
      {existing && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={head.is_active} onChange={(e) => setHead((p) => ({ ...p, is_active: e.target.checked }))} /> Active</label>}
      <FormError error={save.error} />
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button><Button type="submit" loading={save.isPending}>Save recipe</Button></div>
    </form>
  );
}

/** What the saved recipe costs now (ingredients at their average stock cost), and the margin at the selling price. */
function RecipeCost({ bom }: { bom: BillOfMaterials }) {
  const c = bom.costing;
  const makes = Number(bom.output_quantity);
  const low = c.margin_percent != null && Number(c.margin_percent) < 20;
  return (
    <Card>
      <div className="p-4 pb-2">
        <h2 className="font-semibold">What it costs to make</h2>
        <p className="mt-1 text-sm text-stone-600">
          Ingredients at the average cost of the stock you have (or their cost price when none is in stock).
          {bom.made_to_order ? " This product is made when sold: each sale takes these ingredients out of stock." : ""}
          {" "}Save the recipe to update these figures.
        </p>
      </div>
      <Table head={["Ingredient", "Qty", "Cost each", `For ${makes}`]}>
        {bom.lines.map((l) => (
          <tr key={l.id}>
            <Td>{l.component_name}</Td>
            <Td className="text-right font-mono">{Number(l.quantity)} {l.unit}</Td>
            <Td className="text-right font-mono">{l.unit_cost != null ? fmt(l.unit_cost) : "-"}</Td>
            <Td className="text-right font-mono">{l.cost != null ? fmt(l.cost) : "-"}</Td>
          </tr>
        ))}
      </Table>
      <div className="grid gap-3 border-t border-stone-100 p-4 text-sm sm:grid-cols-4">
        <div><p className="text-stone-500">Cost of {makes}</p><p className="font-mono font-medium">{fmt(c.batch_cost)}</p></div>
        <div><p className="text-stone-500">Cost of one</p><p className="font-mono font-medium">{fmt(c.unit_cost)}</p></div>
        <div><p className="text-stone-500">Selling price</p><p className="font-mono font-medium">{Number(c.sale_price) ? fmt(c.sale_price) : "Not set"}</p></div>
        <div>
          <p className="text-stone-500">Margin on one</p>
          <p className={`font-mono font-medium ${c.margin != null && Number(c.margin) < 0 ? "text-red-700" : low ? "text-amber-700" : "text-stone-900"}`}>
            {c.margin != null ? `${fmt(c.margin)} (${Number(c.margin_percent)}%)` : "-"}
          </p>
        </div>
      </div>
    </Card>
  );
}
