"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { AccountOptions } from "@/lib/api/accounting";
import { usePurchaseAccounts } from "@/lib/api/purchasing";
import { useProducts, useVatRates } from "@/lib/api/sales";
import type { PurchaseLine } from "@/lib/api/types";
import { fmt } from "@/lib/format";

import { priceLine } from "./lines-editor";
import { QuickProductModal } from "./quick-product";
import { Button, Card, Input, Select } from "./ui";

export interface BuyLine { product_id: string; description: string; quantity: string; unit_cost: string; tax_rate_id: string; account_id: string }

export const blankBuyLine = (vat = ""): BuyLine => ({ product_id: "", description: "", quantity: "1", unit_cost: "", tax_rate_id: vat, account_id: "" });

export function buyLinesFrom(lines: PurchaseLine[]): BuyLine[] {
  return lines.map((l) => ({
    product_id: l.product_id ?? "", description: l.description ?? "", quantity: String(Number(l.quantity)), unit_cost: String(Number(l.unit_cost ?? 0)),
    tax_rate_id: l.tax_rate_id ?? "", account_id: l.account_id ?? "",
  }));
}

export function buyLinesToRequest(lines: BuyLine[]) {
  return lines.filter((l) => l.product_id || l.description.trim()).map((l) => ({
    product_id: l.product_id || null, description: l.description, quantity: l.quantity || "1", unit_cost: l.unit_cost || "0",
    tax_rate_id: l.tax_rate_id || null, account_id: l.account_id || null,
  }));
}

/** Lines of a purchase order, service order or bill. `accounts` shows the expense account column. */
export function PurchaseLinesEditor({ slug, lines, setLines, includeTax, setIncludeTax, accounts = true }: {
  slug: string; lines: BuyLine[]; setLines: (update: (prev: BuyLine[]) => BuyLine[]) => void; includeTax: boolean; setIncludeTax: (v: boolean) => void;
  accounts?: boolean;
}) {
  const products = useProducts(slug);
  const rates = useVatRates(slug);
  const chart = usePurchaseAccounts(slug);
  const vat = rates.data?.results ?? [];
  const defaultVat = vat.find((r) => r.is_default)?.id ?? "";
  const priced = lines.map((l) => priceLine({ ...l, unit_price: l.unit_cost, discount_percent: "0" }, vat, includeTax));
  const totals = priced.reduce((t, p) => ({ net: t.net + p.net, tax: t.tax + p.tax, total: t.total + p.total }), { net: 0, tax: 0, total: 0 });
  const update = (i: number, patch: Partial<BuyLine>) => setLines((prev) => prev.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  const [adding, setAdding] = useState<number | null>(null);
  function pick(i: number, id: string) {
    if (id === "__new") return setAdding(i);
    const p = (products.data?.results ?? []).find((x) => x.id === id);
    update(i, p ? { product_id: id, description: p.name, unit_cost: String(Number(p.cost_price ?? 0)), tax_rate_id: p.tax_rate_id ?? defaultVat } : { product_id: "" });
  }
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
          <tr>
            <th className="w-48 px-3 py-2 text-left">Product</th>
            <th className="px-3 py-2 text-left">Description</th>
            <th className="w-20 px-3 py-2 text-right">Qty</th>
            <th className="w-28 px-3 py-2 text-right">Unit cost</th>
            <th className="w-32 px-3 py-2 text-left">VAT</th>
            {accounts && <th className="w-44 px-3 py-2 text-left">Charge to</th>}
            <th className="w-28 px-3 py-2 text-right">Amount</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {lines.map((l, i) => {
            const product = (products.data?.results ?? []).find((p) => p.id === l.product_id);
            return (
              <tr key={i}>
                <td className="px-2 py-2">
                  <Select value={l.product_id} onChange={(e) => pick(i, e.target.value)}>
                    <option value="">Free text</option>
                    <option value="__new">+ New product...</option>
                    {(products.data?.results ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </td>
                <td className="px-2 py-2"><Input value={l.description} onChange={(e) => update(i, { description: e.target.value })} /></td>
                <td className="px-2 py-2"><Input inputMode="decimal" className="text-right" value={l.quantity} onChange={(e) => update(i, { quantity: e.target.value })} /></td>
                <td className="px-2 py-2"><Input inputMode="decimal" className="text-right" value={l.unit_cost} onChange={(e) => update(i, { unit_cost: e.target.value })} /></td>
                <td className="px-2 py-2">
                  <Select value={l.tax_rate_id} onChange={(e) => update(i, { tax_rate_id: e.target.value })}>
                    <option value="">No VAT</option>
                    {vat.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </Select>
                </td>
                {accounts && (
                  <td className="px-2 py-2">
                    {product?.track_inventory ? <span className="text-xs text-stone-500">Inventory</span> : (
                      <Select value={l.account_id} onChange={(e) => update(i, { account_id: e.target.value })}>
                        <option value="">{product ? "Cost of goods sold" : "Choose account"}</option>
                        <AccountOptions accounts={chart.data} />
                      </Select>
                    )}
                  </td>
                )}
                <td className="px-3 py-2 text-right font-mono">{fmt(priced[i].total)}</td>
                <td className="px-1">
                  <button type="button" aria-label="Remove line" disabled={lines.length <= 1} className="rounded p-1.5 text-stone-400 hover:text-red-600 disabled:opacity-30"
                    onClick={() => setLines((prev) => prev.filter((_, n) => n !== i))}><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap items-start justify-between gap-4 border-t border-stone-200 px-3 py-3 text-sm">
        <div className="space-y-2">
          <Button type="button" variant="ghost" className="px-2 py-1" onClick={() => setLines((prev) => [...prev, blankBuyLine(defaultVat)])}><Plus className="h-4 w-4" /> Add line</Button>
          <label className="flex items-center gap-2 text-stone-600"><input type="checkbox" checked={includeTax} onChange={(e) => setIncludeTax(e.target.checked)} /> Costs include VAT</label>
        </div>
        <dl className="grid grid-cols-[auto_8rem] gap-x-6 gap-y-1 text-right">
          <dt className="text-stone-500">Subtotal</dt><dd className="font-mono">{fmt(totals.net)}</dd>
          <dt className="text-stone-500">VAT</dt><dd className="font-mono">{fmt(totals.tax)}</dd>
          <dt className="font-semibold">Total</dt><dd className="font-mono font-semibold">{fmt(totals.total)}</dd>
        </dl>
      </div>
      <QuickProductModal open={adding !== null} onClose={() => setAdding(null)} onCreated={(p) => {
        if (adding !== null) update(adding, { product_id: p.id, description: p.name, unit_cost: String(Number(p.cost_price ?? 0)), tax_rate_id: p.tax_rate_id ?? defaultVat });
        setAdding(null);
      }} />
    </Card>
  );
}

/** Read-only purchase lines with totals. */
export function PurchaseLinesView({ lines, subtotal, tax, total, extra }: {
  lines: PurchaseLine[]; subtotal: string; tax: string; total: string; extra?: (l: PurchaseLine) => React.ReactNode;
}) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
          <tr><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Unit cost</th>
            <th className="px-3 py-2 text-left">VAT</th>{extra && <th className="px-3 py-2 text-right">Progress</th>}<th className="px-3 py-2 text-right">Amount</th></tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {lines.map((l) => (
            <tr key={l.id}>
              <td className="px-3 py-2">{l.description}<div className="text-xs text-stone-400">{l.product_tracked ? "Inventory" : l.account_name ?? ""}</div></td>
              <td className="px-3 py-2 text-right font-mono">{Number(l.quantity)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(l.unit_cost)}</td>
              <td className="px-3 py-2 text-stone-500">{l.tax_rate_name ?? "No VAT"}</td>
              {extra && <td className="px-3 py-2 text-right text-xs text-stone-600">{extra(l)}</td>}
              <td className="px-3 py-2 text-right font-mono">{fmt(l.total_amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="text-sm">
          <tr><td colSpan={extra ? 5 : 4} className="px-3 py-1 text-right text-stone-500">Subtotal</td><td className="px-3 py-1 text-right font-mono">{fmt(subtotal)}</td></tr>
          <tr><td colSpan={extra ? 5 : 4} className="px-3 py-1 text-right text-stone-500">VAT</td><td className="px-3 py-1 text-right font-mono">{fmt(tax)}</td></tr>
          <tr className="font-semibold"><td colSpan={extra ? 5 : 4} className="px-3 py-2 text-right">Total</td><td className="px-3 py-2 text-right font-mono">{fmt(total)}</td></tr>
        </tfoot>
      </table>
    </Card>
  );
}
