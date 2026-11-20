"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt } from "@/lib/format";
import { usePeriod } from "@/lib/period";
import { useWorkspace } from "@/lib/workspace";

/** One department: what it spent on (account by account, against budget) and what each person was paid. */
export default function DepartmentDetailPage() {
  const { slug } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const { from, to, label } = usePeriod();
  const q = useQuery({
    queryKey: ["dashboard-department", slug, id, from, to],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/dashboard/departments/{id}/", { params: { path: { workspace: slug, id }, query: { from, to } } })),
  });
  const d = q.data;
  const spent = (d?.spending ?? []).reduce((s, r) => s + Number(r.spent), 0);
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/all-departments`} className="text-sm text-stone-500 hover:underline">&larr; All departments</Link>
      {q.isLoading ? <Spinner /> : q.error ? <ErrorState error={q.error} /> : d && (
        <>
          <PageHeader title={d.name} description={`${label}: what it spent on, and what its people were paid.`} guide="departments" />
          <h2 className="mb-2 text-sm font-semibold">What the money went on</h2>
          <Card className="mb-6">
            {d.spending.length === 0 ? <EmptyState title="Nothing spent in this period" /> : (
              <Table head={["Account", "Spent", "Share", "Budget", "Left"]}>
                {d.spending.map((r) => {
                  const share = spent > 0 ? Math.round((Number(r.spent) / spent) * 100) : 0;
                  const left = Number(r.budget) ? Number(r.budget) - Number(r.spent) : null;
                  return (
                    <tr key={r.account_id}>
                      <Td>{r.account}</Td>
                      <Td className="text-right font-mono">{fmt(r.spent)}</Td>
                      <Td className="w-40"><div className="flex items-center gap-2"><div className="h-2 flex-1 rounded bg-stone-100"><div className="h-2 rounded bg-brand-600" style={{ width: `${share}%` }} /></div><span className="text-xs text-stone-600">{share}%</span></div></Td>
                      <Td className="text-right font-mono">{Number(r.budget) ? fmt(r.budget) : "-"}</Td>
                      <Td className={`text-right font-mono ${left !== null && left < 0 ? "text-red-600" : ""}`}>{left === null ? "-" : fmt(left)}</Td>
                    </tr>
                  );
                })}
              </Table>
            )}
          </Card>
          {d.wages_shown && (
            <>
              <h2 className="mb-2 text-sm font-semibold">Pay, person by person</h2>
              <Card>
                {d.people.length === 0 ? <EmptyState title="No approved payslips in this period" /> : (
                  <Table head={["Person", "Payslips", "Gross", "Net pay"]}>
                    {d.people.map((p) => (
                      <tr key={p.employee_id}>
                        <Td><Link className="font-medium hover:underline" href={`/w/${slug}/employees/${p.employee_id}`}>{p.name}</Link>{p.job_title && <span className="block text-xs text-stone-500">{p.job_title}</span>}</Td>
                        <Td className="text-right">{p.payslips}</Td>
                        <Td className="text-right font-mono">{fmt(p.gross)}</Td>
                        <Td className="text-right font-mono">{fmt(p.net)}</Td>
                      </tr>
                    ))}
                  </Table>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
