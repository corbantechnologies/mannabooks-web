"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { api, fieldError, unwrap } from "@/lib/api/client";
import { useStockProducts } from "@/lib/api/purchasing";
import type { BillOfMaterials } from "@/lib/api/types";
import { useWorkspace, wsPath } from "@/lib/workspace";

import { StockRow, StockRowsEditor } from "./stock-lines";
import { Button, Card, Field, FormError, Input, Select, Textarea } from "./ui";

export function RecipeForm({ existing }: { existing?: BillOfMaterials }) {
  const { slug } = useWorkspace();
  const router = useRouter();
  const products = useStockProducts(slug);
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
        <Field label="Product made" error={fieldError(save.error, "product_id")}><Select required value={head.product_id} onChange={(e) => setHead((p) => ({ ...p, product_id: e.target.value }))}><option value="">Choose</option>{(products.data?.results ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        <Field label="Recipe makes" hint="How many of the product these components make." error={fieldError(save.error, "output_quantity")}><Input inputMode="decimal" value={head.output_quantity} onChange={(e) => setHead((p) => ({ ...p, output_quantity: e.target.value }))} /></Field>
        <Field label="Name (optional)"><Input value={head.name} onChange={(e) => setHead((p) => ({ ...p, name: e.target.value }))} /></Field>
      </Card>
      <StockRowsEditor slug={slug} rows={rows} setRows={setRows} qtyHint="Qty used" />
      <Field label="Method or notes"><Textarea rows={2} value={head.notes} onChange={(e) => setHead((p) => ({ ...p, notes: e.target.value }))} /></Field>
      {existing && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={head.is_active} onChange={(e) => setHead((p) => ({ ...p, is_active: e.target.checked }))} /> Active</label>}
      <FormError error={save.error} />
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button><Button type="submit" loading={save.isPending}>Save recipe</Button></div>
    </form>
  );
}
