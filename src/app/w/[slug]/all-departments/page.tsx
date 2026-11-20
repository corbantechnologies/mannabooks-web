"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt } from "@/lib/format";
import { usePeriod } from "@/lib/period";
import { useWorkspace } from "@/lib/workspace";

/** Every department side by side for owners and finance: spending against budget, and wages. Open one for the detail. */
export default function AllDepartmentsPage() {
  const { slug } = useWorkspace();
  const router = useRouter();
  const { from, to, label } = usePeriod();
  const q = useQuery({
    queryKey: ["dashboard-departments", slug, from, to],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/dashboard/departments/", { params: { path: { workspace: slug }, query: { from, to } } })),
  });
  const d = q.data;
  return (
    <div className="w-full">
      <PageHeader title="All departments" guide="departments"
        description={`What each department spent in ${label}, against its budget, and what its people were paid. Change the year or month at the top.`} />
      {q.isLoading ? <Spinner /> : q.error ? <ErrorState error={q.error} /> : d && (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <Card className="p-4"><p className="text-sm text-stone-500">Spent</p><p className="font-mono text-2xl font-semibold">{fmt(d.total_spent)}</p></Card>
            <Card className="p-4"><p className="text-sm text-stone-500">Budget</p><p className="font-mono text-2xl font-semibold">{fmt(d.total_budget)}</p></Card>
            {d.wages_shown && <Card className="p-4"><p className="text-sm text-stone-500">Wages (gross)</p><p className="font-mono text-2xl font-semibold">{fmt(d.total_wages)}</p></Card>}
          </div>
          <Card>
            {d.rows.length === 0 ? <EmptyState title="No departments yet">Add departments under Organisation, then tag costs with them or their cost centres.</EmptyState> : (
              <Table head={["Department", "Budget", "Spent", "Used", "Left", ...(d.wages_shown ? ["Wages", "People"] : [])]}>
                {d.rows.map((r) => {
                  const used = Number(r.budget) > 0 ? Math.round((Number(r.spent) / Number(r.budget)) * 100) : null;
                  return (
                    <tr key={r.department_id ?? "none"} className={r.department_id ? "cursor-pointer hover:bg-stone-50" : ""}
                      onClick={() => r.department_id && router.push(`/w/${slug}/departments/${r.department_id}`)}>
                      <Td className="font-medium">{r.name}{r.head && <span className="block text-xs font-normal text-stone-500">Head: {r.head}</span>}</Td>
                      <Td className="text-right font-mono">{Number(r.budget) ? fmt(r.budget) : "-"}</Td>
                      <Td className="text-right font-mono">{fmt(r.spent)}</Td>
                      <Td className="w-40">{used === null ? <span className="text-xs text-stone-400">No budget</span> : (
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded bg-stone-100"><div className={`h-2 rounded ${used > 100 ? "bg-red-500" : used > 85 ? "bg-amber-500" : "bg-brand-600"}`} style={{ width: `${Math.min(100, used)}%` }} /></div>
                          <span className={`text-xs ${used > 100 ? "text-red-600" : "text-stone-600"}`}>{used}%</span>
                        </div>
                      )}</Td>
                      <Td className={`text-right font-mono ${r.left !== null && Number(r.left) < 0 ? "text-red-600" : ""}`}>{r.left === null ? "-" : fmt(r.left)}</Td>
                      {d.wages_shown && <><Td className="text-right font-mono">{fmt(r.wages)}</Td><Td className="text-right">{r.people}</Td></>}
                    </tr>
                  );
                })}
              </Table>
            )}
          </Card>
          <p className="mt-3 text-xs text-stone-500">
            Spending is what&apos;s in the books tagged with the department or one of its cost centres. Wages come from approved payslips, by each person&apos;s department.
            Budgets are the approved <Link className="underline" href={`/w/${slug}/accounting/budgets`}>department budgets</Link>.
          </p>
        </>
      )}
    </div>
  );
}
