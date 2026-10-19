"use client";

import { Plus, Trash2 } from "lucide-react";

import { useStockProducts } from "@/lib/api/purchasing";

import { Button, Card, Input, Select, Table, Td } from "./ui";

export interface StockRow { product_id: string; quantity: string; unit_cost?: string }

/** Product and quantity rows (transfers, adjustments). `cost` adds a unit cost column for stock being added. */
export function StockRowsEditor({ slug, rows, setRows, cost, qtyHint }: {
  slug: string; rows: StockRow[]; setRows: (u: (p: StockRow[]) => StockRow[]) => void; cost?: boolean; qtyHint?: string;
}) {
  const products = useStockProducts(slug);
  const update = (i: number, patch: Partial<StockRow>) => setRows((p) => p.map((r, n) => (n === i ? { ...r, ...patch } : r)));
  return (
    <Card>
      <Table head={cost ? ["Product", qtyHint ?? "Qty", "Unit cost", ""] : ["Product", qtyHint ?? "Qty", ""]}>
        {rows.map((r, i) => (
          <tr key={i}>
            <Td>
              <Select value={r.product_id} onChange={(e) => {
                const p = (products.data?.results ?? []).find((x) => x.id === e.target.value);
                update(i, { product_id: e.target.value, ...(cost && !r.unit_cost ? { unit_cost: String(Number(p?.cost_price ?? 0)) } : {}) });
              }}>
                <option value="">Choose a product</option>
                {(products.data?.results ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}{p.stock_on_hand != null ? ` (${Number(p.stock_on_hand)} ${p.unit})` : ""}</option>)}
              </Select>
            </Td>
            <Td className="w-32"><Input inputMode="decimal" className="text-right" value={r.quantity} onChange={(e) => update(i, { quantity: e.target.value })} /></Td>
            {cost && <Td className="w-36"><Input inputMode="decimal" className="text-right" placeholder="Average" value={r.unit_cost ?? ""} onChange={(e) => update(i, { unit_cost: e.target.value })} /></Td>}
            <Td className="w-10"><button type="button" aria-label="Remove" disabled={rows.length <= 1} className="text-stone-400 hover:text-red-600 disabled:opacity-30" onClick={() => setRows((p) => p.filter((_, n) => n !== i))}><Trash2 className="h-4 w-4" /></button></Td>
          </tr>
        ))}
      </Table>
      <div className="px-3 py-2"><Button type="button" variant="ghost" className="px-2 py-1" onClick={() => setRows((p) => [...p, { product_id: "", quantity: "1" }])}><Plus className="h-4 w-4" /> Add product</Button></div>
      {(products.data?.results ?? []).length === 0 && <p className="px-4 pb-3 text-sm text-amber-700">No products track stock yet. Tick &quot;Track stock&quot; on a product first.</p>}
    </Card>
  );
}
