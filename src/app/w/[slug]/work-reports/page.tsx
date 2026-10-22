"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { REPORT_FREQUENCIES, REPORT_STATUS } from "@/lib/api/assets";
import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function WorkReportsPage() {
  const { slug, can } = useWorkspace();
  const [tab, setTab] = useState<"todo" | "review" | "requests">("todo");
  const subs = useQuery({
    queryKey: ["report-submissions", slug, tab],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/report-submissions/", { params: { path: { workspace: slug }, query: { box: tab === "review" ? "review" : "todo", page_size: 100 } } })),
    enabled: tab !== "requests",
  });
  const reqs = useQuery({
    queryKey: ["report-requests", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/report-requests/", { params: { path: { workspace: slug }, query: { page_size: 100 } } })),
    enabled: tab === "requests",
  });
  const rows = subs.data?.results ?? [];
  const tabs = [{ key: "todo", label: "My reports" }, { key: "review", label: "To review" }, { key: "requests", label: "My requests" }] as const;
  return (
    <div className="w-full">
      <PageHeader title="Work reports" guide="work-reports"
        description="Reports your manager asks you for, and the ones you ask your team for: weekly sales, site visits, monthly summaries."
        actions={can("workreports.request") && <Link href={`/w/${slug}/work-reports/new`}><Button><Plus className="h-4 w-4" /> Ask for a report</Button></Link>} />
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-stone-200">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={clsx("-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm", tab === t.key ? "border-brand-700 font-medium text-brand-800" : "border-transparent text-stone-500 hover:text-stone-800")}>{t.label}</button>
        ))}
      </div>
      {tab === "requests" ? (
        <Card>
          {reqs.isLoading ? <div className="px-4"><Spinner /></div> : reqs.error ? <div className="p-4"><ErrorState error={reqs.error} /></div> : !(reqs.data?.results ?? []).length ? (
            <EmptyState title="You haven't asked for any reports" />
          ) : (
            <Table head={["Report", "From", "How often", "Waiting", "To review", "Status"]}>
              {reqs.data!.results.map((r) => (
                <tr key={r.id} className="hover:bg-stone-50">
                  <Td><Link className="font-medium hover:underline" href={`/w/${slug}/work-reports/requests/${r.id}`}>{r.title}</Link></Td>
                  <Td className="text-xs">{r.assignee_names.slice(0, 3).join(", ")}{r.assignee_names.length > 3 ? ` +${r.assignee_names.length - 3}` : ""}</Td>
                  <Td>{REPORT_FREQUENCIES.find((f) => f.value === r.frequency)?.label}</Td>
                  <Td>{(r.counts.pending ?? 0) + (r.counts.late ?? 0) + (r.counts.returned ?? 0)}</Td>
                  <Td>{r.counts.submitted ?? 0}</Td>
                  <Td><Badge tone={r.status === "active" ? "green" : "stone"}>{r.status === "active" ? "Active" : "Closed"}</Badge></Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      ) : subs.isLoading ? <Spinner /> : subs.error ? <ErrorState error={subs.error} /> : rows.length === 0 ? (
        <Card><EmptyState title={tab === "todo" ? "No reports asked of you" : "Nothing to review"} /></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Link key={r.id} href={`/w/${slug}/work-reports/submissions/${r.id}`} className="block">
              <Card className="flex flex-wrap items-center justify-between gap-2 p-4 transition-colors hover:border-brand-300">
                <div>
                  <p className="font-medium text-stone-900">{r.title}{r.period_label ? <span className="font-normal text-stone-500">, {r.period_label}</span> : null}</p>
                  <p className="text-sm text-stone-600">{tab === "todo" ? `Asked by ${r.requested_by_name}` : r.employee_name} · due {fmtDate(r.due_date)}{r.submitted_late ? " · came in late" : ""}</p>
                </div>
                <Badge tone={REPORT_STATUS[r.status ?? "pending"].tone}>{REPORT_STATUS[r.status ?? "pending"].label}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
