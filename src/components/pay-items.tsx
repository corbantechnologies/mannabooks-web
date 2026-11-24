"use client";

import { Plus, Trash2 } from "lucide-react";

import type { PayItem } from "@/lib/api/people";

import { Button, Input, Select } from "./ui";

/** Allowances (earnings) and deductions, e.g. house allowance, overtime, SACCO, salary advance. */
export function PayItemsEditor({ items, onChange, hint }: { items: PayItem[]; onChange: (items: PayItem[]) => void; hint?: string }) {
  const update = (i: number, patch: Partial<PayItem>) => onChange(items.map((x, n) => (n === i ? { ...x, ...patch } : x)));
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Allowances and deductions {hint && <span className="font-normal text-stone-500">{hint}</span>}</p>
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-[1fr_8rem_7rem_auto_auto] items-center gap-2">
          <Input placeholder="Name" value={item.name} readOnly={!!item.advance} title={item.advance ? "Takes back a salary advance. Change the amount, or remove it to take it back next time." : undefined} onChange={(e) => update(i, { name: e.target.value })} />
          <Select value={item.kind} disabled={!!item.advance} onChange={(e) => update(i, { kind: e.target.value as PayItem["kind"] })}><option value="earning">Allowance</option><option value="deduction">Deduction</option></Select>
          <div className="flex items-center gap-1">
            <Input inputMode="decimal" className="text-right" placeholder={item.percent != null ? "%" : "Amount"} title={item.percent != null ? "A share of the basic salary each month" : undefined}
              value={String(item.percent != null ? item.percent : item.amount)}
              onChange={(e) => update(i, item.percent != null ? { percent: e.target.value } : { amount: e.target.value })} />
            {!item.advance && (
              <button type="button" className={`rounded px-1 text-xs ${item.percent != null ? "bg-brand-700 text-white" : "text-stone-500 hover:bg-stone-100"}`}
                title="Switch between a fixed amount and a % of the basic salary (e.g. a 10% bonus)"
                onClick={() => update(i, item.percent != null ? { percent: null } : { percent: "", amount: "0" })}>%</button>
            )}
          </div>
          {item.kind === "earning" ? (
            <label className="flex items-center gap-1 text-xs text-stone-600"><input type="checkbox" checked={item.taxable ?? true} onChange={(e) => update(i, { taxable: e.target.checked })} /> Taxed</label>
          ) : <span />}
          <button type="button" aria-label="Remove" className="text-stone-400 hover:text-red-600" onClick={() => onChange(items.filter((_, n) => n !== i))}><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <Button type="button" variant="ghost" className="px-2 py-1" onClick={() => onChange([...items, { name: "", kind: "earning", amount: "", taxable: true }])}><Plus className="h-4 w-4" /> Add</Button>
    </div>
  );
}
