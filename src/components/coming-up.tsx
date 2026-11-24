"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Card, ErrorState, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

const KIND: Record<string, string> = { bill: "Bill", voucher: "Voucher", salaries: "Salaries", statutory: "Statutory", vat: "VAT", invoice: "Invoice", portfolio_bill: "Portfolio billing", portfolio_renewal: "Supplier renewal" };

/**
 * What's due to pay and to collect, soonest first: bills, approved vouchers, salaries, PAYE/SHIF/NSSF/Housing Levy by the 9th,
 * VAT by the 20th, and customers' invoices. Each row opens where it can be paid or chased.
 */
export function ComingUp({ compact }: { compact?: boolean }) {
  const { slug } = useWorkspace();
  const [days, setDays] = useState(30);
  const [show, setShow] = useState<"all" | "out" | "in">("all");
  const q = useQuery({
    queryKey: ["coming-up", slug, days],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/dashboard/coming-up/", { params: { path: { workspace: slug }, query: { days } } })),
  });
  if (q.isLoading) return <Card className="p-5"><Spinner /></Card>;
  if (q.error) return <ErrorState error={q.error} />;
  const d = q.data!;
  const today = d.today;
  const weekEnd = new Date(new Date(`${today}T00:00:00`).getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const rows = d.items.filter((r) => show === "all" || r.direction === show);
  const groups: [string, typeof rows][] = [
    ["Overdue", rows.filter((r) => r.overdue)],
    ["Next 7 days", rows.filter((r) => !r.overdue && r.due_date <= weekEnd)],
    [`Later, to ${fmtDate(d.horizon)}`, rows.filter((r) => !r.overdue && r.due_date > weekEnd)],
  ];
  const limit = compact ? 6 : Infinity;
  let shown = 0;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Coming up</h2>
          <p className="text-xs text-stone-500">What&apos;s due to pay and to collect</p>
        </div>
        <div className="flex gap-1 text-xs">
          {([["all", "All"], ["out", "To pay"], ["in", "To collect"]] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setShow(k)} className={`rounded-full px-2.5 py-1 ${show === k ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>{label}</button>
          ))}
          <select aria-label="How far ahead" value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-full border border-stone-200 bg-white px-2 py-1">
            <option value={7}>7 days</option><option value={30}>30 days</option><option value={60}>60 days</option><option value={90}>90 days</option>
          </select>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-red-50 p-3"><p className="text-xs text-red-700">To pay</p><p className="font-mono text-lg font-semibold text-stone-900">{fmt(d.to_pay)}</p>
          {Number(d.overdue_to_pay) > 0 && <p className="text-xs text-red-700">{fmt(d.overdue_to_pay)} overdue</p>}</div>
        <div className="rounded-lg bg-emerald-50 p-3"><p className="text-xs text-emerald-700">To collect</p><p className="font-mono text-lg font-semibold text-stone-900">{fmt(d.to_collect)}</p>
          {Number(d.overdue_to_collect) > 0 && <p className="text-xs text-emerald-800">{fmt(d.overdue_to_collect)} overdue</p>}</div>
      </div>
      {rows.length === 0 ? <p className="mt-4 text-sm text-stone-500">Nothing due in the next {days} days.</p> : (
        <div className="mt-4 space-y-4">
          {groups.filter(([, g]) => g.length).map(([title, g]) => (
            <div key={title}>
              <p className={`mb-1 text-xs font-semibold uppercase tracking-wide ${title === "Overdue" ? "text-red-600" : "text-stone-500"}`}>{title}</p>
              <ul className="divide-y divide-stone-100">
                {g.map((r, i) => {
                  if (shown >= limit) return null;
                  shown += 1;
                  const Icon = r.direction === "out" ? ArrowUpRight : ArrowDownLeft;
                  return (
                    <li key={`${r.href}-${i}`}>
                      <Link href={`/w/${slug}/${r.href}`} className="flex items-center gap-3 py-2 text-sm hover:bg-stone-50">
                        <Icon className={`h-4 w-4 shrink-0 ${r.direction === "out" ? "text-red-500" : "text-emerald-600"}`} aria-hidden />
                        <span className="w-20 shrink-0 text-xs text-stone-500">{fmtDate(r.due_date)}</span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-stone-900">{r.title}</span>
                          <span className="block truncate text-xs text-stone-500">{KIND[r.kind]} · {r.party}{r.note ? ` · ${r.note}` : ""}</span></span>
                        <span className="font-mono text-stone-900">{fmt(r.amount)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {compact && rows.length > limit && <Link href={`/w/${slug}/coming-up`} className="block text-sm font-medium text-brand-700 hover:underline">See all {rows.length} &rarr;</Link>}
        </div>
      )}
    </Card>
  );
}
