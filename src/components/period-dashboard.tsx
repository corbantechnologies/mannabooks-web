"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";

import { Card, ErrorState, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt } from "@/lib/format";
import { monthName, usePeriod } from "@/lib/period";
import { useWorkspace } from "@/lib/workspace";

const INCOME = "#047857"; // validated pair: green and amber pass colour-blind and contrast checks
const EXPENSES = "#d97706";
const short = (n: number) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e3 ? `${Math.round(n / 1e3)}K` : String(Math.round(n)));

function Tile({ label, value, note, href, tone }: { label: string; value: string | number; note?: string; href?: string; tone?: "good" | "bad" }) {
  const { slug } = useWorkspace();
  const body = (
    <Card className="h-full p-4 transition-colors hover:border-brand-300">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className={clsx("mt-1 font-mono text-xl font-semibold", tone === "bad" ? "text-red-700" : "text-stone-900")}>{fmt(value)}</p>
      {note && <p className="mt-0.5 text-xs text-stone-500">{note}</p>}
    </Card>
  );
  return href ? <Link href={`/w/${slug}${href}`}>{body}</Link> : body;
}

/** The overview of the chosen financial year or month: what came in, what went out, what's owed, and the trend. */
export function PeriodDashboard() {
  const { slug, context } = useWorkspace();
  const { from, to, label, months, period, setPeriod, year } = usePeriod();
  const [hover, setHover] = useState<number | null>(null);
  const summary = useQuery({
    queryKey: ["period-summary", slug, from, to],
    enabled: Boolean(from && to),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/reports/period/", { params: { path: { workspace: slug }, query: { from, to } } })),
  });
  if (!year) return <Card className="p-5 text-sm text-stone-600">Choose a financial year at the top to see its numbers.</Card>;
  const d = summary.data;
  const cur = context.workspace.currency;
  const peak = Math.max(1, ...(d?.by_month ?? []).flatMap((m) => [Number(m.income), Number(m.expenses)]));
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-stone-900">{label} <span className="text-sm font-normal text-stone-500">in {cur}</span></h2>
        {year.status === "closed" && <span className="text-xs text-stone-500">This year is closed</span>}
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        <button onClick={() => setPeriod({ ...period, month: "" })}
          className={clsx("shrink-0 rounded-full px-3 py-1 text-sm", !period.month ? "bg-brand-700 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200")}>Whole year</button>
        {months.map((m) => (
          <button key={m} onClick={() => setPeriod({ ...period, month: m })}
            className={clsx("shrink-0 rounded-full px-3 py-1 text-sm", period.month === m ? "bg-brand-700 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200")}>{monthName(m).slice(0, 3)}</button>
        ))}
      </div>
      {summary.isLoading ? <Spinner label="Adding up the numbers" /> : summary.error ? <ErrorState error={summary.error} /> : d && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Income" value={d.income} note={`Gross profit ${fmt(d.gross_profit)}`} href="/accounting/reports/profit-and-loss" />
            <Tile label="Net profit" value={d.net_profit} tone={Number(d.net_profit) < 0 ? "bad" : "good"} note={`Costs ${fmt(Number(d.cost_of_sales) + Number(d.expenses))}`} href="/accounting/reports/profit-and-loss" />
            <Tile label="Cash in, less cash out" value={Number(d.cash_in) - Number(d.cash_out)} note={`In ${fmt(d.cash_in)} · out ${fmt(d.cash_out)}`} href="/banking" />
            <Tile label="Cash and bank at the end" value={d.cash_balance} tone={Number(d.cash_balance) < 0 ? "bad" : undefined} href="/banking" />
            <Tile label="Invoiced" value={d.invoiced} note={`${d.invoice_count} invoices`} href="/sales/invoices" />
            <Tile label="Cash sales" value={d.cash_sales} note={`${d.cash_sale_count} sales`} href="/sales/cash-sales" />
            <Tile label="Customers paid" value={d.payments_received} href="/sales/payments" />
            <Tile label="Bills and expenses" value={Number(d.bills) + Number(d.spent_on_expenses)} note={`${d.bill_count} bills · expenses ${fmt(d.spent_on_expenses)}`} href="/purchasing/bills" />
            <Tile label="Customers owe you" value={d.receivables} tone={Number(d.receivables_overdue) > 0 ? "bad" : undefined} note={`Overdue ${fmt(d.receivables_overdue)}`} href="/accounting/reports/aged-receivables" />
            <Tile label="You owe suppliers" value={d.payables} note={`Overdue ${fmt(d.payables_overdue)}`} href="/accounting/reports/aged-payables" />
            <Tile label={Number(d.net_vat) >= 0 ? "VAT to pay" : "VAT to carry forward"} value={Math.abs(Number(d.net_vat))} note={`On sales ${fmt(d.output_vat)} · on purchases ${fmt(d.input_vat)}`} href="/accounting/reports/vat" />
            <Tile label="Payroll cost" value={d.payroll_cost} href="/payroll" />
          </div>

          {d.by_month.length > 1 && (
            <Card className="p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-stone-900">Income and expenses by month</h3>
                <div className="flex gap-4 text-xs text-stone-600">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: INCOME }} /> Income</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: EXPENSES }} /> Expenses</span>
                </div>
              </div>
              <div className="relative">
                <div className="flex h-44 items-end gap-1 border-b border-stone-200" role="img" aria-label="Income and expenses for each month">
                  {d.by_month.map((m, i) => (
                    <button key={m.month} type="button" className="flex h-full flex-1 items-end justify-center gap-[2px] rounded-t px-0.5 hover:bg-stone-50 focus:bg-stone-50 focus:outline-none"
                      onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                      onClick={() => setPeriod({ ...period, month: m.month.slice(0, 7) })} aria-label={`${monthName(m.month.slice(0, 7))}: income ${fmt(m.income)}, expenses ${fmt(m.expenses)}`}>
                      <span className="w-1/2 max-w-4 rounded-t" style={{ background: INCOME, height: `${(Number(m.income) / peak) * 100}%`, minHeight: Number(m.income) > 0 ? 2 : 0 }} />
                      <span className="w-1/2 max-w-4 rounded-t" style={{ background: EXPENSES, height: `${(Number(m.expenses) / peak) * 100}%`, minHeight: Number(m.expenses) > 0 ? 2 : 0 }} />
                    </button>
                  ))}
                </div>
                {hover !== null && (
                  <div className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-md border border-stone-200 bg-white px-3 py-2 text-xs shadow"
                    style={{ left: `${((hover + 0.5) / d.by_month.length) * 100}%` }}>
                    <p className="font-semibold text-stone-900">{monthName(d.by_month[hover].month.slice(0, 7), true)}</p>
                    <p className="text-stone-700">Income {fmt(d.by_month[hover].income)}</p>
                    <p className="text-stone-700">Expenses {fmt(d.by_month[hover].expenses)}</p>
                    <p className="font-medium text-stone-900">Profit {fmt(d.by_month[hover].profit)}</p>
                  </div>
                )}
                <div className="mt-1 flex gap-1 text-center text-[11px] text-stone-500">
                  {d.by_month.map((m) => <span key={m.month} className="flex-1">{monthName(m.month.slice(0, 7)).slice(0, 3)}</span>)}
                </div>
                <p className="mt-1 text-[11px] text-stone-400">Tallest bar: {short(peak)}. Click a month to open it.</p>
              </div>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="border-b border-stone-200 px-4 py-2.5 text-sm font-semibold">Top customers</h3>
              {d.top_customers.length === 0 ? <p className="px-4 py-6 text-sm text-stone-500">No sales in this period.</p> : (
                <ul className="divide-y divide-stone-100">
                  {d.top_customers.map((c) => <li key={c.name} className="flex justify-between px-4 py-2 text-sm"><span>{c.name}</span><span className="font-mono">{fmt(c.amount)}</span></li>)}
                </ul>
              )}
            </Card>
            <Card>
              <h3 className="border-b border-stone-200 px-4 py-2.5 text-sm font-semibold">Best sellers</h3>
              {d.top_products.length === 0 ? <p className="px-4 py-6 text-sm text-stone-500">No sales in this period.</p> : (
                <ul className="divide-y divide-stone-100">
                  {d.top_products.map((p) => (
                    <li key={p.name} className="flex justify-between gap-3 px-4 py-2 text-sm"><span>{p.name} <span className="text-xs text-stone-500">× {Number(p.quantity)}</span></span><span className="font-mono">{fmt(p.amount)}</span></li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <p className="text-xs text-stone-500">Sales figures are before VAT. Money owed is as at {to}.</p>
        </>
      )}
    </section>
  );
}
