"use client";

import { Plus, Trash2 } from "lucide-react";

import { useProducts } from "@/lib/api/sales";

import { Button, Card, Input, Select, Table, Td } from "./ui";

export interface DeliveryLine { product_id: string; description: string; quantity: string; unit: string }

export const blankDeliveryLine = (): DeliveryLine => ({ product_id: "", description: "", quantity: "1", unit: "" });

/** Quantities only: what was packed onto the vehicle. */
export function DeliveryLinesEditor({ slug, lines, setLines }: { slug: string; lines: DeliveryLine[]; setLines: (update: (prev: DeliveryLine[]) => DeliveryLine[]) => void }) {
  const products = useProducts(slug);
  const update = (i: number, patch: Partial<DeliveryLine>) => setLines((prev) => prev.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  return (
    <Card>
      <Table head={["Product", "Description", "Qty", "Unit", ""]}>
        {lines.map((l, i) => (
          <tr key={i}>
            <Td className="w-56">
              <Select value={l.product_id} onChange={(e) => {
                const p = (products.data?.results ?? []).find((x) => x.id === e.target.value);
                update(i, p ? { product_id: p.id, description: p.name, unit: p.unit ?? "" } : { product_id: "" });
              }}>
                <option value="">Free text</option>
                {(products.data?.results ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Td>
            <Td><Input value={l.description} onChange={(e) => update(i, { description: e.target.value })} /></Td>
            <Td className="w-24"><Input inputMode="decimal" className="text-right" value={l.quantity} onChange={(e) => update(i, { quantity: e.target.value })} /></Td>
            <Td className="w-24"><Input value={l.unit} onChange={(e) => update(i, { unit: e.target.value })} /></Td>
            <Td className="w-10"><button type="button" aria-label="Remove line" disabled={lines.length <= 1} className="rounded p-1.5 text-stone-400 hover:text-red-600 disabled:opacity-30" onClick={() => setLines((prev) => prev.filter((_, n) => n !== i))}><Trash2 className="h-4 w-4" /></button></Td>
          </tr>
        ))}
      </Table>
      <div className="px-3 py-2"><Button type="button" variant="ghost" className="px-2 py-1" onClick={() => setLines((prev) => [...prev, blankDeliveryLine()])}><Plus className="h-4 w-4" /> Add line</Button></div>
    </Card>
  );
}
