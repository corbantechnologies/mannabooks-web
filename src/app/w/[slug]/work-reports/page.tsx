"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { PRIORITY, REPORT_FREQUENCIES, REPORT_STATUS, dueText } from "@/lib/api/assets";
import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function WorkReportsPage() {
  const { slug, can } = useWorkspace();
  const [tab, setTab] = useState<"todo" | "review" | "requests" | "record">("todo");
  const subs = useQuery({
    queryKey: ["report-submissions", slug, tab],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/report-submissions/", { params: { path: { workspace: slug }, query: { box: tab === "review" ? "review" : "todo", page_size: 100 } } })),
    enabled: tab === "todo" || tab === "review",
  });
  const reqs = useQuery({
    queryKey: ["report-requests", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/report-requests/", { params: { path: { workspace: slug }, query: { page_size: 100 } } })),
    enabled: tab === "requests",
  });
  const record = useQuery({
    queryKey: ["report-record", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/report-submissions/record/", { params: { path: { workspace: slug } } })),
    enabled: tab === "record",
  });
  const rows = subs.data?.results ?? [];
  const tabs = [{ key: "todo", label: "Asked of me" }, { key: "review", label: "To review" }, { key: "requests", label: "My requests" }, { key: "record", label: "On time" }] as const;
  return (
    <div className="w-full">
      <PageHeader title="Work reports" guide="work-reports"
        description="Reports your manager asks you for, and the ones you ask your team for: weekly sales, site visits, monthly summaries. Also tasks that repeat. One-off tasks are under Tasks."
        actions={can("workreports.request") && <div className="flex gap-2">
          <Link href={`/w/${slug}/work-reports/new?kind=task`}><Button variant="secondary"><Plus className="h-4 w-4" /> Repeating task</Button></Link>
          <Link href={`/w/${slug}/work-reports/new`}><Button><Plus className="h-4 w-4" /> Ask for a report</Button></Link>
        </div>} />
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-stone-200">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={clsx("-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm", tab === t.key ? "border-brand-700 font-medium text-brand-800" : "border-transparent text-stone-500 hover:text-stone-800")}>{t.label}</button>
        ))}
      </div>
      {tab === "record" ? (
        <div className="space-y-2">
          <p className="text-sm text-stone-600">Reports and tasks handed in by the due date (and time), late, or never, out of all those due so far. A report sent back and handed in again keeps the mark of when it first came in. Lowest first.</p>
          <Card>
            {record.isLoading ? <div className="px-4"><Spinner /></div> : record.error ? <div className="p-4"><ErrorState error={record.error} /></div> : !(record.data ?? []).length ? (
              <EmptyState title="No reports due yet" />
            ) : (
              <Table head={["Person", "Department", "On time", "Late", "Never came in", "Due so far", "On-time record"]}>
                {record.data!.map((r) => (
                  <tr key={r.employee_id}>
                    <Td className="font-medium">{r.employee_name}</Td><Td className="text-stone-600">{r.department ?? ""}</Td>
                    <Td className="text-right">{r.on_time}</Td><Td className="text-right">{r.late}</Td><Td className="text-right">{r.missed}</Td><Td className="text-right">{r.counted}</Td>
                    <Td>{r.on_time_percent == null ? <span className="text-stone-400">Nothing due yet</span> : (
                      <Badge tone={r.on_time_percent >= 90 ? "green" : r.on_time_percent >= 70 ? "amber" : "red"}>{r.on_time_percent}% on time</Badge>
                    )}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
      ) : tab === "requests" ? (
        <Card>
          {reqs.isLoading ? <div className="px-4"><Spinner /></div> : reqs.error ? <div className="p-4"><ErrorState error={reqs.error} /></div> : !(reqs.data?.results ?? []).length ? (
            <EmptyState title="You haven't asked for any reports or tasks" />
          ) : (
            <Table head={["Report or task", "From", "How often", "Waiting", "To review", "Status"]}>
              {reqs.data!.results.map((r) => (
                <tr key={r.id} className="hover:bg-stone-50">
                  <Td><Link className="font-medium hover:underline" href={`/w/${slug}/work-reports/requests/${r.id}`}>{r.title}</Link>
                    <span className="ml-2 inline-flex gap-1">{r.kind === "task" && <Badge>Task</Badge>}{r.priority === "high" && <Badge tone="red">High</Badge>}</span></Td>
                  <Td className="text-xs">{r.assignee_names.slice(0, 3).join(", ")}{r.assignee_names.length > 3 ? ` +${r.assignee_names.length - 3}` : ""}</Td>
                  <Td>{REPORT_FREQUENCIES.find((f) => f.value === r.frequency)?.label}</Td>
                  <Td>{(r.counts.pending ?? 0) + (r.counts.in_progress ?? 0) + (r.counts.late ?? 0) + (r.counts.returned ?? 0)}</Td>
                  <Td>{r.counts.submitted ?? 0}</Td>
                  <Td><Badge tone={r.status === "active" ? "green" : "stone"}>{r.status === "active" ? "Active" : "Closed"}</Badge></Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      ) : subs.isLoading ? <Spinner /> : subs.error ? <ErrorState error={subs.error} /> : rows.length === 0 ? (
        <Card><EmptyState title={tab === "todo" ? "Nothing asked of you" : "Nothing to review"} /></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Link key={r.id} href={`/w/${slug}/work-reports/submissions/${r.id}`} className="block">
              <Card className="flex flex-wrap items-center justify-between gap-2 p-4 transition-colors hover:border-brand-300">
                <div>
                  <p className="font-medium text-stone-900">{r.title}{r.period_label ? <span className="font-normal text-stone-500">, {r.period_label}</span> : null}</p>
                  <p className="text-sm text-stone-600">{r.kind === "task" ? "Task · " : ""}{tab === "todo" ? `Asked by ${r.requested_by_name}` : r.employee_name} · {dueText(r.due_date, r.due_time, fmtDate)}{r.submitted_late ? " · came in late" : ""}</p>
                </div>
                <div className="flex items-center gap-1">
                  {r.priority === "high" && <Badge tone={PRIORITY.high.tone}>{PRIORITY.high.label}</Badge>}
                  <Badge tone={REPORT_STATUS[r.status ?? "pending"].tone}>{r.kind === "task" && r.status === "accepted" ? "Done" : REPORT_STATUS[r.status ?? "pending"].label}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
