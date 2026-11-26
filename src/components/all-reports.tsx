"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Select, Spinner, Table, Td } from "@/components/ui";
import { REPORT_STATUS } from "@/lib/api/assets";
import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";

const STATES = [
  { value: "", label: "Any status" },
  { value: "waiting", label: "Waiting (not handed in)" },
  { value: "handed_in", label: "Handed in, to review" },
  { value: "accepted", label: "Accepted (done)" },
  { value: "returned", label: "Sent back" },
  { value: "late", label: "Late (overdue or came in late)" },
] as const;

const EMPTY = { state: "", employee: "", department: "", request: "", since: "", until: "" };

/**
 * Work reports, All reports tab: every report and repeating task you can see (yours, your requests', or everyone's
 * with work reports access), looking back as well as forward, filtered by status, person, department, report and due dates.
 */
export function AllReports({ slug }: { slug: string }) {
  const [f, setF] = useState(EMPTY);
  const [size, setSize] = useState(50);
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => { setSize(50); setF((p) => ({ ...p, [k]: e.target.value })); };
  const query = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
  const list = useQuery({
    queryKey: ["report-submissions", slug, "all", query, size],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/report-submissions/", {
      params: { path: { workspace: slug }, query: { box: "all", page_size: size, ...query } as { box: "all" } },
    })),
  });
  // the choices: the people and departments in the reports you can see, and the reports themselves
  const people = useQuery({
    queryKey: ["report-record", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/report-submissions/record/", { params: { path: { workspace: slug } } })),
  });
  const reqs = useQuery({
    queryKey: ["report-requests", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/report-requests/", { params: { path: { workspace: slug }, query: { page_size: 100 } } })),
  });
  const persons = [...(people.data ?? [])].sort((a, b) => a.employee_name.localeCompare(b.employee_name));
  const departments = [...new Map(persons.filter((p) => p.department_id).map((p) => [p.department_id!, p.department ?? ""])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const rows = list.data?.results ?? [];
  const count = list.data?.count ?? 0;
  const filtered = Object.keys(query).length > 0;

  return (
    <div className="space-y-3">
      <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <Field label="Status"><Select value={f.state} onChange={set("state")}>{STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></Field>
        <Field label="Person">
          <Select value={f.employee} onChange={set("employee")}>
            <option value="">Everyone</option>
            {persons.map((p) => <option key={p.employee_id} value={p.employee_id}>{p.employee_name}</option>)}
          </Select>
        </Field>
        <Field label="Department">
          <Select value={f.department} onChange={set("department")}>
            <option value="">Every department</option>
            {departments.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </Select>
        </Field>
        <Field label="Report or task">
          <Select value={f.request} onChange={set("request")}>
            <option value="">All of them</option>
            {(reqs.data?.results ?? []).map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </Select>
        </Field>
        <Field label="Due from"><Input type="date" value={f.since} onChange={set("since")} /></Field>
        <Field label="Due to"><Input type="date" value={f.until} min={f.since || undefined} onChange={set("until")} /></Field>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-stone-600">
        <span>{list.isLoading ? "" : `${count} report${count === 1 ? "" : "s"}${filtered ? " match" : ""}, latest due first.`}</span>
        {filtered && <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => { setF(EMPTY); setSize(50); }}>Clear filters</button>}
      </div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title={filtered ? "No reports match these filters" : "No reports yet"} />
        ) : (
          <Table head={["Report or task", "Person", "Department", "Due", "Status", "Handed in"]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50">
                <Td>
                  <Link className="font-medium hover:underline" href={`/w/${slug}/work-reports/submissions/${r.id}`}>{r.title}</Link>
                  {r.period_label ? <span className="text-stone-500">, {r.period_label}</span> : null}
                  {r.kind === "task" && <span className="ml-2"><Badge>Task</Badge></span>}
                </Td>
                <Td>{r.employee_name}</Td>
                <Td className="text-stone-600">{r.department_name}</Td>
                <Td className="whitespace-nowrap">{fmtDate(r.due_date)}{r.due_time ? ` ${r.due_time.slice(0, 5)}` : ""}</Td>
                <Td><Badge tone={REPORT_STATUS[r.status ?? "pending"].tone}>{r.kind === "task" && r.status === "accepted" ? "Done" : REPORT_STATUS[r.status ?? "pending"].label}</Badge></Td>
                <Td className="whitespace-nowrap">
                  {r.submitted_at ? <>{fmtDate(r.submitted_at.slice(0, 10))}{r.submitted_late && <span className="ml-2"><Badge tone="amber">Late</Badge></span>}</> : <span className="text-stone-400">Not yet</span>}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {rows.length < count && (
        <div className="flex justify-center"><Button variant="secondary" onClick={() => setSize((n) => n + 50)}>Show more</Button></div>
      )}
    </div>
  );
}
