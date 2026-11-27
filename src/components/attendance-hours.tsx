"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { useState } from "react";

import { Badge, Card, EmptyState, ErrorState, Field, Input, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

const STATUS: Record<string, [string, "red" | "amber" | "green" | "stone"]> = {
  under: ["Under", "amber"], over: ["Over", "red"], ok: ["On track", "green"], no_hours: ["No hours", "stone"],
};

/** Hours worked this month against the hours expected and what the person is paid (pay only with Payroll: view, or your own). */
export function AttendanceHoursVsPay() {
  const { slug } = useWorkspace();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const settings = useQuery({ queryKey: ["attendance-settings", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/attendance/settings/", wsPath(slug))), retry: false });
  const q = useQuery({
    queryKey: ["attendance-hours", slug, month],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/attendance/hours-vs-pay/", { params: { path: { workspace: slug }, query: { month: `${month}-01` } } })),
  });
  const rule = (settings.data?.alerts as Record<string, Record<string, unknown>> | undefined)?.hours_vs_pay;
  const hoursAMonth = Number(rule?.monthly_hours ?? 160);
  const rows = q.data ?? [];
  const money = rows.some((r) => r.salary !== null);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Month"><Input type="month" className="w-44" value={month} onChange={(e) => setMonth(e.target.value || month)} /></Field>
        <p className="pb-2 text-xs text-stone-500">An hour is worth the monthly salary over {hoursAMonth} hours. Expected hours are that share of the working days gone by.
          Under is below 90% of them, over is above 110%.</p>
      </div>
      <Card>
        {q.isLoading ? <div className="p-4"><Spinner /></div> : q.error ? <ErrorState error={q.error} /> : rows.length === 0 ? <EmptyState title="Nobody tracked to show" /> : (
          <Table head={["Person", "Hours", "Expected so far", "", ...(money ? ["Salary", "An hour", "Hours worth", "Paid so far"] : []), "Weeks under floor", "Near overtime", "Missed breaks"]}>
            {rows.map((r) => (
              <tr key={r.employee_id}>
                <Td className="font-medium">{r.name}{r.department && <span className="block text-xs font-normal text-stone-500">{r.department}</span>}</Td>
                <Td className="text-right font-mono">{Number(r.hours).toFixed(1)}</Td>
                <Td className="text-right font-mono">{Number(r.expected).toFixed(1)}{r.percent !== null && <span className="block text-xs text-stone-500">{r.percent}%</span>}</Td>
                <Td><Badge tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge></Td>
                {money && <>
                  <Td className="text-right font-mono">{r.salary === null ? <span className="text-stone-400">{r.pay_type === "salary" ? "-" : "Waged"}</span> : fmt(r.salary)}</Td>
                  <Td className="text-right font-mono">{r.per_hour === null ? "" : fmt(r.per_hour)}</Td>
                  <Td className={clsx("text-right font-mono", r.worth !== null && r.paid_so_far !== null && Number(r.worth) < Number(r.paid_so_far) * 0.9 && "text-amber-700")}>{r.worth === null ? "" : fmt(r.worth)}</Td>
                  <Td className="text-right font-mono">{r.paid_so_far === null ? "" : fmt(r.paid_so_far)}</Td>
                </>}
                <Td className={clsx("text-right", r.weeks_below_floor ? "font-semibold text-amber-700" : "text-stone-400")}>{r.weeks_below_floor || "-"}</Td>
                <Td className={clsx("text-right", r.weeks_near_extra ? "font-semibold text-red-700" : "text-stone-400")}>{r.weeks_near_extra || "-"}</Td>
                <Td className={clsx("text-right", r.missed_breaks ? "font-semibold text-amber-700" : "text-stone-400")}>{r.missed_breaks || "-"}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <p className="text-xs text-stone-500">Nobody&apos;s pay changes here: it shows how hours and pay compare. Extra hours are still paid through Months, once approved.</p>
    </div>
  );
}
