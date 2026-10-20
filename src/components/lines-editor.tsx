"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { useCustomerPrices, useProducts, useVatRates } from "@/lib/api/sales";
import type { Product, TaxRate } from "@/lib/api/types";
import { fmt } from "@/lib/format";

import { Button, Card, Input, Select } from "./ui";
import { QuickProductModal } from "./quick-product";

export interface EditLine {
  product_id: string;
  description: string;
  quantity: string;
  unit?: string; // "" or the product's own unit; another one must be one of the product's other units
  unit_price: string;
  discount_percent: string;
  discount_amount?: string; // fixed discount, e.g. loyalty points (kept when copying a document)
  tax_rate_id: string; // "" = no VAT
}

export const blankLine = (taxRateId = ""): EditLine => ({
  product_id: "", description: "", quantity: "1", unit_price: "", discount_percent: "0", tax_rate_id: taxRateId,
});

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Same arithmetic as the API (apps.core.sales.price): rounded per line to cents. */
export function priceLine(line: EditLine, rates: TaxRate[], includeTax: boolean) {
  const gross = round2((Number(line.quantity) || 0) * (Number(line.unit_price) || 0) * (1 - (Number(line.discount_percent) || 0) / 100));
  const amount = Math.max(round2(gross - (Number(line.discount_amount) || 0)), 0);
  const rate = Number(rates.find((r) => r.id === line.tax_rate_id)?.rate ?? 0) / 100;
  if (includeTax) {
    const net = round2(amount / (1 + rate));
    return { net, tax: round2(amount - net), total: amount };
  }
  const tax = round2(amount * rate);
  return { net: amount, tax, total: round2(amount + tax) };
}

export function linesToRequest(lines: EditLine[]) {
  return lines
    .filter((l) => l.description.trim() || l.product_id)
    .map((l) => ({
      product_id: l.product_id || null,
      description: l.description,
      quantity: l.quantity || "1",
      ...(l.product_id && l.unit ? { unit: l.unit } : {}),
      unit_price: l.unit_price || "0",
      discount_percent: l.discount_percent || "0",
      discount_amount: l.discount_amount || "0",
      tax_rate_id: l.tax_rate_id || null,
    }));
}

export function linesFromDocument(lines: { product_id?: string | null; description?: string; quantity?: string; unit?: string; unit_price?: string; discount_percent?: string; discount_amount?: string; tax_rate_id?: string | null }[]): EditLine[] {
  return lines.map((l) => ({
    product_id: l.product_id ?? "", description: l.description ?? "", quantity: String(Number(l.quantity ?? 1)), unit: l.unit ?? "",
    unit_price: String(Number(l.unit_price ?? 0)), discount_percent: String(Number(l.discount_percent ?? 0)),
    discount_amount: String(Number(l.discount_amount ?? 0)), tax_rate_id: l.tax_rate_id ?? "",
  }));
}

export function LinesEditor({
  slug,
  lines,
  setLines,
  includeTax,
  setIncludeTax,
  currency,
  disabled,
  customerId,
}: {
  slug: string;
  lines: EditLine[];
  setLines: (update: (prev: EditLine[]) => EditLine[]) => void;
  includeTax: boolean;
  setIncludeTax: (v: boolean) => void;
  currency: string;
  disabled?: boolean;
  /** Prices come from this customer's price list. */
  customerId?: string;
}) {
  const products = useProducts(slug);
  const prices = useCustomerPrices(slug, customerId);
  const rates = useVatRates(slug);
  const vat = rates.data?.results ?? [];
  const defaultRate = vat.find((r) => r.is_default)?.id ?? "";
  const priced = lines.map((l) => priceLine(l, vat, includeTax));
  const totals = priced.reduce((t, p) => ({ net: t.net + p.net, tax: t.tax + p.tax, total: t.total + p.total }), { net: 0, tax: 0, total: 0 });

  function update(i: number, patch: Partial<EditLine>) {
    setLines((prev) => prev.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  }
  const [adding, setAdding] = useState<number | null>(null);
  function pickProduct(i: number, id: string) {
    if (id === "__new") return setAdding(i);
    const p = (products.data?.results ?? []).find((x: Product) => x.id === id);
    const listed = prices.data?.[id];
    update(i, p ? { product_id: id, description: p.name, unit: p.unit ?? "", unit_price: String(Number(listed ?? p.sale_price ?? 0)), tax_rate_id: p.tax_rate_id ?? defaultRate } : { product_id: "", unit: "" });
  }
  const productOf = (id: string) => (products.data?.results ?? []).find((x: Product) => x.id === id);
  /** A carton: its own price, else the price of one piece times the pieces in it (as the API does). */
  function pickUnit(i: number, unit: string) {
    const p = productOf(lines[i].product_id);
    if (!p) return;
    const base = Number(prices.data?.[p.id] ?? p.sale_price ?? 0);
    const other = (p.units ?? []).find((u) => u.unit === unit);
    const price = other ? (other.sale_price != null ? Number(other.sale_price) : base * Number(other.factor)) : base;
    update(i, { unit, unit_price: String(Math.round(price * 10000) / 10000) });
  }

  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
          <tr>
            <th className="w-48 px-3 py-2 text-left">Product</th>
            <th className="px-3 py-2 text-left">Description</th>
            <th className="w-24 px-3 py-2 text-right">Qty</th>
            <th className="w-32 px-3 py-2 text-right">Price</th>
            <th className="w-20 px-3 py-2 text-right">Disc %</th>
            <th className="w-36 px-3 py-2 text-left">VAT</th>
            <th className="w-32 px-3 py-2 text-right">Amount</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {lines.map((l, i) => (
            <tr key={i}>
              <td className="px-2 py-2">
                <Select disabled={disabled} value={l.product_id} onChange={(e) => pickProduct(i, e.target.value)}>
                  <option value="">Free text</option>
                  <option value="__new">+ New product...</option>
                  {(products.data?.results ?? []).map((p) => <option key={p.id} value={p.id}>{p.code ? `${p.code} ` : ""}{p.name}</option>)}
                </Select>
              </td>
              <td className="px-2 py-2"><Input disabled={disabled} value={l.description} onChange={(e) => update(i, { description: e.target.value })} /></td>
              <td className="px-2 py-2">
                <Input disabled={disabled} inputMode="decimal" className="text-right" value={l.quantity} onChange={(e) => update(i, { quantity: e.target.value })} />
                {(productOf(l.product_id)?.units ?? []).length > 0 && (
                  <Select disabled={disabled} aria-label="Unit" className="mt-1 py-1 text-xs" value={l.unit || productOf(l.product_id)?.unit || ""} onChange={(e) => pickUnit(i, e.target.value)}>
                    <option value={productOf(l.product_id)?.unit ?? ""}>{productOf(l.product_id)?.unit}</option>
                    {productOf(l.product_id)!.units!.map((u) => <option key={u.unit} value={u.unit}>{u.unit} of {Number(u.factor)}</option>)}
                  </Select>
                )}
              </td>
              <td className="px-2 py-2"><Input disabled={disabled} inputMode="decimal" className="text-right" value={l.unit_price} onChange={(e) => update(i, { unit_price: e.target.value })} /></td>
              <td className="px-2 py-2"><Input disabled={disabled} inputMode="decimal" className="text-right" value={l.discount_percent} onChange={(e) => update(i, { discount_percent: e.target.value })} /></td>
              <td className="px-2 py-2">
                <Select disabled={disabled} value={l.tax_rate_id} onChange={(e) => update(i, { tax_rate_id: e.target.value })}>
                  <option value="">No VAT</option>
                  {vat.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </Select>
              </td>
              <td className="px-3 py-2 text-right font-mono">{fmt(priced[i].total)}</td>
              <td className="px-1">
                {!disabled && (
                  <button type="button" className="rounded p-1.5 text-stone-400 hover:bg-stone-100 hover:text-red-600 disabled:opacity-30" disabled={lines.length <= 1}
                    onClick={() => setLines((prev) => prev.filter((_, n) => n !== i))} aria-label="Remove line">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap items-start justify-between gap-4 border-t border-stone-200 px-3 py-3 text-sm">
        <div className="space-y-2">
          {!disabled && <Button type="button" variant="ghost" className="px-2 py-1" onClick={() => setLines((prev) => [...prev, blankLine(defaultRate)])}><Plus className="h-4 w-4" /> Add line</Button>}
          <label className="flex items-center gap-2 text-stone-600">
            <input type="checkbox" disabled={disabled} checked={includeTax} onChange={(e) => setIncludeTax(e.target.checked)} /> Prices include VAT
          </label>
        </div>
        <dl className="grid grid-cols-[auto_8rem] gap-x-6 gap-y-1 text-right">
          <dt className="text-stone-500">Subtotal</dt><dd className="font-mono">{fmt(totals.net)}</dd>
          <dt className="text-stone-500">VAT</dt><dd className="font-mono">{fmt(totals.tax)}</dd>
          <dt className="font-semibold">Total {currency}</dt><dd className="font-mono font-semibold">{fmt(totals.total)}</dd>
        </dl>
      </div>
      <QuickProductModal open={adding !== null} onClose={() => setAdding(null)} onCreated={(p) => {
        if (adding !== null) update(adding, { product_id: p.id, description: p.name, unit_price: String(Number(p.sale_price ?? 0)), tax_rate_id: p.tax_rate_id ?? defaultRate });
        setAdding(null);
      }} />
    </Card>
  );
}

/** The default VAT rate id, once rates have loaded (for new blank lines). */
export function useDefaultVat(slug: string): string {
  const rates = useVatRates(slug);
  return rates.data?.results.find((r) => r.is_default)?.id ?? "";
}
