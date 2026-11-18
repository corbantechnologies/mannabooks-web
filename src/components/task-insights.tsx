"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";

import { Card, ErrorState, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { useWorkspace } from "@/lib/workspace";

type Counts = components["schemas"]["TaskCounts"];
type Scope = "company" | "department" | "team" | "me";

const SCOPE_LABEL: Record<Scope, string> = { company: "Whole company", department: "My departments", team: "My team", me: "Just me" };
const SCOPE_LABEL_ALL: Record<Scope, string> = { ...SCOPE_LABEL, department: "By department" };
const DAYS = [{ v: "30", l: "Last 30 days" }, { v: "90", l: "Last 90 days" }, { v: "365", l: "Last year" }, { v: "", l: "All time" }];

// Task states, so status colours with a label and legend beside them (never colour alone). Text stays in ink colours.
const PARTS = [
  { key: "done", label: "Done", fill: "bg-emerald-600" },
  { key: "in_progress", label: "In progress", fill: "bg-sky-500" },
  { key: "not_started", label: "Not started", fill: "bg-stone-300" },
] as const;

const pct = (n: number, of: number) => (of ? Math.round((100 * n) / of) : 0);

/** Task numbers for the company, a department, a team or one person: done, in progress, not started, late; and who carries most. */
export function TaskInsights({ compact = false }: { compact?: boolean }) {
  const { slug, can, context } = useWorkspace();
  const widest: Scope = can("tasks.view") ? "company" : (context.headed_departments ?? []).length ? "department" : (context.team_size ?? 0) > 0 ? "team" : "me";
  const [scope, setScope] = useState<Scope>(widest);
  const [days, setDays] = useState("90");
  const q = useQuery({
    queryKey: ["task-insights", slug, scope, days],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/tasks/insights/", { params: { path: { workspace: slug }, query: { scope, days: days ? Number(days) : undefined } } })),
  });
  const d = q.data;
  const labels = can("tasks.view") ? SCOPE_LABEL_ALL : SCOPE_LABEL;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {compact && <h2 className="mr-auto text-sm font-semibold text-stone-900">Tasks</h2>}
        <div className="w-44"><Select aria-label="Whose tasks" value={scope} onChange={(e) => setScope(e.target.value as Scope)}>
          {((d?.scopes ?? [widest, "me"]) as Scope[]).filter((v, i, a) => a.indexOf(v) === i).map((s) => <option key={s} value={s}>{labels[s]}</option>)}
        </Select></div>
        <div className="w-40"><Select aria-label="Period" value={days} onChange={(e) => setDays(e.target.value)}>{DAYS.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}</Select></div>
        {compact && <Link href={`/w/${slug}/tasks?view=insights`} className="text-sm text-brand-700 hover:underline">More &rarr;</Link>}
      </div>
      {q.isLoading ? <Spinner /> : q.error ? <ErrorState error={q.error} /> : d && (
        <>
          <Tiles c={d.summary} />
          {d.summary.total === 0 ? null : (
            <>
              <Card className="p-4">
                <div className="mb-1 flex items-center justify-between text-sm"><span className="font-medium text-stone-900">All {d.summary.total} tasks</span><Legend /></div>
                <StackBar c={d.summary} />
              </Card>
              {d.people.length > 0 && (
                <Card className="p-4">
                  <h3 className="text-sm font-semibold text-stone-900">Who carries the most</h3>
                  <p className="mb-3 text-xs text-stone-500">Open tasks first: a long bar of not started or in progress is someone with a lot on. Bars are to the same scale.</p>
                  <PeopleBars rows={compact ? d.people.slice(0, 6) : d.people} />
                </Card>
              )}
              {!compact && d.departments.length > 0 && (
                <Card>
                  <Table head={["Department", "Tasks", "Done", "In progress", "Not started", "Late", "On time"]}>
                    {d.departments.map((r) => <CountRow key={r.name} name={r.name} c={r} />)}
                  </Table>
                </Card>
              )}
              {!compact && d.people.length > 0 && (
                <Card>
                  <Table head={["Person", "Tasks", "Done", "In progress", "Not started", "Late", "On time"]}>
                    {d.people.map((r) => <CountRow key={r.id} name={r.name} sub={r.department} c={r} />)}
                  </Table>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Tiles({ c }: { c: Counts }) {
  const tiles = [
    { label: "Tasks", value: String(c.total), note: c.total ? `${c.on_time_percent ?? "-"}${c.on_time_percent == null ? "" : "%"} of finished ones on time` : "None in this period" },
    { label: "Done", value: `${pct(c.done, c.total)}%`, note: `${c.done} tasks` },
    { label: "In progress", value: `${pct(c.in_progress, c.total)}%`, note: `${c.in_progress} tasks` },
    { label: "Not started", value: `${pct(c.not_started, c.total)}%`, note: `${c.not_started} tasks` },
    { label: "Late", value: `${pct(c.late, c.total)}%`, note: `${c.overdue} overdue now · ${c.done_late} done late`, warn: c.late > 0 },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => (
        <Card key={t.label} className={clsx("p-4", t.warn && "border-red-200")}>
          <p className="text-sm text-stone-500">{t.label}</p>
          <p className="text-2xl font-semibold text-stone-900">{t.value}</p>
          <p className="text-xs text-stone-500">{t.note}</p>
        </Card>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <span className="flex flex-wrap gap-3 text-xs text-stone-600">
      {PARTS.map((p) => <span key={p.key} className="flex items-center gap-1"><span className={clsx("h-2.5 w-2.5 rounded-sm", p.fill)} />{p.label}</span>)}
    </span>
  );
}

/** One stacked bar: done, in progress, not started, with a 2px gap between parts. */
function StackBar({ c, max }: { c: Counts; max?: number }) {
  const of = max ?? c.total;
  return (
    <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-sm bg-stone-50">
      {PARTS.map((p) => {
        const n = c[p.key];
        if (!n) return null;
        return <div key={p.key} className={clsx("h-full first:rounded-l-sm last:rounded-r-sm", p.fill)} style={{ width: `${(100 * n) / of}%` }}
          title={`${p.label}: ${n} (${pct(n, c.total)}%)`} />;
      })}
    </div>
  );
}

function PeopleBars({ rows }: { rows: (Counts & { id: string; name: string; open: number })[] }) {
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <div className="space-y-2.5">
      <Legend />
      {rows.map((r) => (
        <div key={r.id} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[11rem_1fr_auto]">
          <span className="truncate text-stone-700" title={r.name}>{r.name}</span>
          <StackBar c={r} max={max} />
          <span className="whitespace-nowrap text-xs text-stone-500">{r.open} open{r.late ? <span className="text-red-700"> · {r.late} late</span> : null}</span>
        </div>
      ))}
    </div>
  );
}

function CountRow({ name, sub, c }: { name: string; sub?: string | null; c: Counts }) {
  return (
    <tr>
      <Td className="font-medium">{name}{sub && <span className="block text-xs font-normal text-stone-500">{sub}</span>}</Td>
      <Td className="text-right">{c.total}</Td>
      <Td className="text-right">{c.done} <span className="text-xs text-stone-500">{pct(c.done, c.total)}%</span></Td>
      <Td className="text-right">{c.in_progress} <span className="text-xs text-stone-500">{pct(c.in_progress, c.total)}%</span></Td>
      <Td className="text-right">{c.not_started} <span className="text-xs text-stone-500">{pct(c.not_started, c.total)}%</span></Td>
      <Td className="text-right">{c.late ? <span className="text-red-700">{c.late}</span> : 0}</Td>
      <Td className="text-right">{c.on_time_percent == null ? "-" : `${c.on_time_percent}%`}</Td>
    </tr>
  );
}
