"use client";

import clsx from "clsx";
import Link from "next/link";

import { Td } from "@/components/ui";
import type { ReportSection } from "@/lib/api/control";
import { fmt } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export type StatementItem =
  | { kind: "section"; section: ReportSection; negate?: boolean }
  | { kind: "total"; label: string; amount: string | number; compare?: string | number; strong?: boolean };

/** A financial statement: sections of accounts, with subtotal lines between them. */
export function StatementTable({ items, compare, compareLabel, currentLabel }: { items: StatementItem[]; compare: boolean; compareLabel?: string; currentLabel: string }) {
  const { slug } = useWorkspace();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
          <tr>
            <th className="px-4 py-2.5 font-medium">Account</th>
            <th className="px-4 py-2.5 text-right font-medium">{currentLabel}</th>
            {compare && <th className="px-4 py-2.5 text-right font-medium">{compareLabel}</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => item.kind === "total" ? (
            <tr key={i} className={clsx("border-t border-stone-200", item.strong ? "bg-stone-100 font-semibold" : "bg-stone-50 font-medium")}>
              <Td>{item.label}</Td>
              <Td className={clsx("text-right font-mono", Number(item.amount) < 0 && "text-red-700")}>{fmt(item.amount)}</Td>
              {compare && <Td className="text-right font-mono">{fmt(item.compare ?? 0)}</Td>}
            </tr>
          ) : (
            <SectionRows key={i} section={item.section} compare={compare} slug={slug} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionRows({ section, compare, slug }: { section: ReportSection; compare: boolean; slug: string }) {
  return (
    <>
      <tr><td colSpan={compare ? 3 : 2} className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-stone-500">{section.label}</td></tr>
      {section.rows.length === 0 && <tr><td colSpan={compare ? 3 : 2} className="px-4 py-1.5 text-sm text-stone-400">None</td></tr>}
      {section.rows.map((r) => (
        <tr key={r.account_id ?? r.name} className="hover:bg-stone-50">
          <td className="px-4 py-1.5 pl-8">
            {r.account_id ? <Link className="hover:underline" href={`/w/${slug}/accounting/accounts/${r.account_id}`}><span className="mr-2 font-mono text-xs text-stone-400">{r.code}</span>{r.name}</Link> : r.name}
          </td>
          <td className="px-4 py-1.5 text-right font-mono">{fmt(r.amount)}</td>
          {compare && <td className="px-4 py-1.5 text-right font-mono text-stone-500">{fmt(r.compare)}</td>}
        </tr>
      ))}
      <tr className="border-t border-stone-100">
        <td className="px-4 py-1.5 pl-8 font-medium">Total {section.label.toLowerCase()}</td>
        <td className="px-4 py-1.5 text-right font-mono font-medium">{fmt(section.total)}</td>
        {compare && <td className="px-4 py-1.5 text-right font-mono text-stone-500">{fmt(section.compare_total)}</td>}
      </tr>
    </>
  );
}

export function sectionCsv(items: StatementItem[], compare: boolean): (string | number)[][] {
  const out: (string | number)[][] = [];
  for (const item of items) {
    if (item.kind === "total") { out.push(["", item.label, item.amount, ...(compare ? [item.compare ?? 0] : [])]); continue; }
    out.push(["", item.section.label]);
    for (const r of item.section.rows) out.push([r.code, r.name, r.amount, ...(compare ? [r.compare] : [])]);
    out.push(["", `Total ${item.section.label.toLowerCase()}`, item.section.total, ...(compare ? [item.section.compare_total] : [])]);
  }
  return out;
}
