"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { CircleAlert } from "lucide-react";
import { useState } from "react";

import { MonthChart } from "@/components/charts";
import { Card, ErrorState, Field, Input, PageHeader, Select, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

/** Where cash is heading, month by month, if nothing new is decided, and when it would go below the floor. */
export default function CashProjectionPage() {
  const { slug } = useWorkspace();
  const [months, setMonths] = useState("6");
  const [floor, setFloor] = useState("");
  const q = useQuery({
    queryKey: ["cash-forecast", slug, months, floor],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/reports/cash-forecast/", { params: { path: { workspace: slug }, query: { months: Number(months), ...(floor ? { floor: Number(floor) } : {}) } } })),
  });
  const history = useQuery({
    queryKey: ["history", slug, 6],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/reports/history/", { params: { path: { workspace: slug }, query: { months: 6 } } })),
  });
  const f = q.data;
  const past = (history.data ?? []).slice(0, -1).map((h) => ({ label: h.label, cash: Number(h.cash) }));
  const ahead = (f?.months ?? []).map((m) => ({ label: m.label, cash: Number(m.closing) }));
  const chartRows = [...past, ...ahead];

  return (
    <div className="w-full">
      <PageHeader title="Cash projection" guide="banking"
        description="Where cash is heading if nothing new is decided: today's cash, plus what customers owe and average cash sales, less bills, payroll and average spending." />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Look ahead"><Select value={months} onChange={(e) => setMonths(e.target.value)}>{["3", "6", "9", "12", "18"].map((m) => <option key={m} value={m}>{m} months</option>)}</Select></Field>
        <Field label="Warn me below" hint="Blank: the accounts' minimums"><Input type="number" min="0" className="w-40" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="e.g. 150000" /></Field>
      </div>
      {q.isLoading ? <Spinner /> : q.error ? <ErrorState error={q.error} /> : f && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Card className="p-4"><p className="text-xs uppercase tracking-wide text-stone-500">Cash and bank today</p><p className="mt-1 font-mono text-xl font-semibold">{fmt(f.cash_now)}</p></Card>
            <Card className="p-4"><p className="text-xs uppercase tracking-wide text-stone-500">In {f.months.length} months</p><p className={clsx("mt-1 font-mono text-xl font-semibold", Number(f.months.at(-1)?.closing) < 0 && "text-red-700")}>{fmt(f.months.at(-1)?.closing ?? 0)}</p></Card>
            <Card className={clsx("p-4", f.first_below && "border-red-300 bg-red-50")}>
              <p className="text-xs uppercase tracking-wide text-stone-500">Below the floor</p>
              {f.floor == null ? <p className="mt-1 text-sm text-stone-500">Set a floor above, or a minimum on your accounts.</p>
                : f.first_below ? <p className="mt-1 flex items-center gap-1.5 text-lg font-semibold text-red-700"><CircleAlert className="h-5 w-5" />{new Date(`${f.first_below}T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
                : <p className="mt-1 text-lg font-semibold text-emerald-700">Not in this period</p>}
            </Card>
          </div>
          <Card className="mb-4 p-4">
            <h2 className="mb-2 text-sm font-semibold">Cash: the last months, then the projection (dashed)</h2>
            <MonthChart rows={chartRows} floor={f.floor != null ? Number(f.floor) : null}
              series={[{ key: "cash", label: "Cash and bank", color: "#047857", kind: "line", dashedFrom: past.length }]} />
          </Card>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr><th className="px-4 py-2 text-left font-medium">Month</th><th className="px-3 py-2 text-right font-medium">Start</th><th className="px-3 py-2 text-right font-medium">Money in</th><th className="px-3 py-2 text-right font-medium">Money out</th><th className="px-3 py-2 text-right font-medium">End</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {f.months.map((m) => (
                  <tr key={m.month} className={clsx(f.floor != null && Number(m.closing) < Number(f.floor) && "bg-red-50/60")}>
                    <td className="px-4 py-2">{m.label}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(m.opening)}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-700" title={`Customers: ${fmt(m.customers)}`}>{fmt(m.money_in)}</td>
                    <td className="px-3 py-2 text-right font-mono text-red-700" title={`Bills: ${fmt(m.bills)}, payroll: ${fmt(m.payroll)}`}>{fmt(m.money_out)}</td>
                    <td className={clsx("px-3 py-2 text-right font-mono font-semibold", Number(m.closing) < 0 && "text-red-700")}>{fmt(m.closing)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="mt-3 text-xs text-stone-500">
            Each month adds what customers owe (by due date; overdue in the first month) and average cash sales and other income ({fmt(f.assumptions.cash_sales_a_month)} a month),
            and takes off supplier bills (by due date), payroll ({fmt(f.assumptions.payroll_a_month)} a month, from the latest payroll) and average direct spending ({fmt(f.assumptions.spending_a_month)} a month).
            It knows only what is in the books: a guide, not a promise.
          </p>
        </>
      )}
    </div>
  );
}
