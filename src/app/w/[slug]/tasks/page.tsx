"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { ask } from "@/components/confirm";
import { TASK_STATUS, type Task, TaskForm, dueLabel, holder } from "@/components/task-form";
import { TaskInsights } from "@/components/task-insights";
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

type Box = "mine" | "given" | "department" | "all" | "insights";
type Action = "take" | "hand_back" | "start" | "done" | "accept" | "return" | "cancel" | "reopen";

/** Tasks: things to do by a date (and time), for yourself, your team, or any colleague. */
export default function TasksPage() {
  const { slug, can, context } = useWorkspace();
  const heads = (context.headed_departments ?? []).length > 0;
  const [box, setBox] = useState<Box>(() => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "insights" ? "insights" : "mine"));
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [filters, setFilters] = useState<Filters>(readFilters);
  const setFilter = (patch: Partial<Filters>) => setFilters((f) => { const next = { ...f, ...patch }; saveFilters(next); return next; });
  const [view, setView] = useState<"list" | "board">(() => {
    try { return localStorage.getItem("mannabooks.tasks-view") === "board" ? "board" : "list"; } catch { return "list"; }
  });
  const chooseView = (v: "list" | "board") => { setView(v); try { localStorage.setItem("mannabooks.tasks-view", v); } catch { /* just for now */ } };
  const q = useQuery({
    queryKey: ["tasks", slug, box, open], enabled: box !== "insights",
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/tasks/", { params: { path: { workspace: slug }, query: { box, open, page_size: 200 } as never } })),
  });
  const rows = q.data?.results ?? [];
  const tabs: { key: Box; label: string }[] = [
    { key: "mine", label: "My tasks" }, { key: "given", label: "I gave" },
    ...(heads || can("tasks.view") ? [{ key: "department" as Box, label: "Departments" }] : []),
    ...(can("tasks.view") ? [{ key: "all" as Box, label: "Everyone's" }] : []),
    { key: "insights", label: "Insights" },
  ];
  const shown = rows.filter((t) => matches(t, filters));
  const sorted = [...shown].sort(byUrgency);
  const finished = sorted.filter((t) => t.status === "done" || t.status === "cancelled")
    .sort((a, b) => (b.done_at ?? b.created_at ?? "").localeCompare(a.done_at ?? a.created_at ?? ""));  // latest finished first
  const active = sorted.filter((t) => t.status !== "done" && t.status !== "cancelled");
  const pool = box === "mine" ? active.filter((t) => t.in_pool) : [];
  const listed = box === "mine" ? active.filter((t) => !t.in_pool) : active;
  return (
    <div className="w-full">
      <PageHeader title="Tasks" guide="tasks"
        description="Things to do by a date, and a time if it matters. For yourself, the people below you, or any colleague if your role allows. For tasks that repeat, use Work reports."
        actions={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> New task</Button>} />
      <div className="mb-4 flex flex-wrap items-end gap-3 border-b border-stone-200">
        <div className="-mb-px flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setBox(t.key)} className={clsx("shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm", box === t.key ? "border-brand-700 font-medium text-brand-800" : "border-transparent text-stone-500 hover:text-stone-800")}>{t.label}</button>
          ))}
        </div>
        {box !== "insights" && (
          <div className="ml-auto flex items-center gap-3 pb-2">
            <div className="flex rounded-md border border-stone-200 p-0.5 text-xs" role="group" aria-label="Show as">
              {(["list", "board"] as const).map((v) => (
                <button key={v} type="button" onClick={() => chooseView(v)} aria-pressed={view === v}
                  className={clsx("rounded px-2 py-1", view === v ? "bg-stone-800 text-white" : "text-stone-600 hover:bg-stone-100")}>{v === "list" ? "List" : "Board"}</button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-stone-600"><input type="checkbox" checked={!open} onChange={(e) => setOpen(!e.target.checked)} /> Show done and cancelled</label>
          </div>
        )}
      </div>
      {box !== "insights" && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input className="max-w-xs" placeholder="Search tasks, people, departments" value={filters.q} onChange={(e) => setFilter({ q: e.target.value })} />
          <Select aria-label="Priority" className="w-36" value={filters.priority} onChange={(e) => setFilter({ priority: e.target.value })}>
            <option value="">Any priority</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option>
          </Select>
          <Select aria-label="When due" className="w-40" value={filters.due} onChange={(e) => setFilter({ due: e.target.value as Filters["due"] })}>
            <option value="">Due any time</option><option value="overdue">Overdue</option><option value="today">Due today</option>
            <option value="week">Due this week</option><option value="next">Due next week</option><option value="none">No deadline</option>
          </Select>
          {view === "list" && (
            <Select aria-label="Group by" className="w-44" value={filters.group} onChange={(e) => setFilter({ group: e.target.value as Filters["group"] })}>
              <option value="">No grouping</option><option value="priority">Group by priority</option><option value="date">Group by due date</option>
              <option value="week">Group by week</option><option value="department">Group by department</option>
            </Select>
          )}
          {(filters.q || filters.priority || filters.due) && (
            <button type="button" className="text-sm text-brand-700 hover:underline" onClick={() => setFilter({ q: "", priority: "", due: "" })}>
              Clear ({shown.length} of {rows.length})
            </button>
          )}
        </div>
      )}
      {box === "insights" ? <TaskInsights /> : q.isLoading ? <Spinner /> : q.error ? <ErrorState error={q.error} /> : rows.length === 0 ? (
        <>
          {box === "department" && <DepartmentRecord />}
          <Card><EmptyState title={box === "mine" ? "Nothing to do" : box === "given" ? "You haven't given anyone a task" : "No tasks"}>{box === "mine" ? "Add a task for yourself with New task." : undefined}</EmptyState></Card>
        </>
      ) : shown.length === 0 ? (
        <Card><EmptyState title="No tasks match">Change the search or filters above.</EmptyState></Card>
      ) : view === "board" ? (
        <div className="space-y-5">
          {box === "department" && <DepartmentRecord />}
          <TaskBoard rows={sorted} box={box} showFinished={!open} />
        </div>
      ) : (
        <div className="space-y-5">
          {box === "department" && <DepartmentRecord />}
          {pool.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold">For your department, not taken yet</h2>
              <div className="space-y-2">{pool.map((t) => <TaskRow key={t.id} t={t} box={box} />)}</div>
            </section>
          )}
          {listed.length > 0 && (
            <section>
              {pool.length > 0 && <h2 className="mb-2 text-sm font-semibold">Mine</h2>}
              {filters.group ? <Grouped rows={listed} group={filters.group} box={box} /> : <div className="space-y-2">{listed.map((t) => <TaskRow key={t.id} t={t} box={box} />)}</div>}
            </section>
          )}
          {!open && active.length === 0 && <p className="text-sm text-stone-500">Nothing open.</p>}
          {finished.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-stone-500">Finished</h2>
              <div className="space-y-2 opacity-80">{finished.map((t) => <TaskRow key={t.id} t={t} box={box} />)}</div>
            </section>
          )}
        </div>
      )}
      {adding && <TaskForm onClose={() => setAdding(false)} />}
    </div>
  );
}

const PRIORITY_RANK: Record<string, number> = { high: 0, normal: 1, low: 2 };

type Filters = { q: string; priority: string; due: "" | "overdue" | "today" | "week" | "next" | "none"; group: "" | "priority" | "date" | "week" | "department" };
const NO_FILTERS: Filters = { q: "", priority: "", due: "", group: "" };
const FILTERS_KEY = "mb.tasks.filters";

/** Remembered per person in this browser: the grouping and filters they last used. */
function readFilters(): Filters {
  try {
    return { ...NO_FILTERS, ...JSON.parse(localStorage.getItem(FILTERS_KEY) ?? "{}") };
  } catch {
    return NO_FILTERS;
  }
}
function saveFilters(f: Filters) {
  try { localStorage.setItem(FILTERS_KEY, JSON.stringify(f)); } catch { /* private window: not remembered */ }
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Monday of the week a date falls in. */
function weekStart(day: string): string {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
}

function matches(t: Task, f: Filters): boolean {
  const needle = f.q.trim().toLowerCase();
  if (needle && ![t.title, t.details, t.assigned_to_name, t.given_by_name, t.department_name, t.project_name, t.customer_name]
    .some((v) => (v ?? "").toLowerCase().includes(needle))) return false;
  if (f.priority && (t.priority ?? "normal") !== f.priority) return false;
  if (f.due) {
    const today = iso(new Date());
    const thisWeek = weekStart(today);
    const nextWeek = (() => { const d = new Date(`${thisWeek}T12:00:00`); d.setDate(d.getDate() + 7); return iso(d); })();
    if (f.due === "none") return !t.due_date;
    if (!t.due_date) return false;
    if (f.due === "overdue") return !!t.is_overdue;
    if (f.due === "today") return t.due_date === today;
    if (f.due === "week") return weekStart(t.due_date) === thisWeek;
    if (f.due === "next") return weekStart(t.due_date) === nextWeek;
  }
  return true;
}

/** The list in sections: by priority, by due date, by week, or by department. */
function Grouped({ rows, group, box }: { rows: Task[]; group: Exclude<Filters["group"], "">; box: Box }) {
  const today = iso(new Date());
  const thisWeek = weekStart(today);
  const key = (t: Task): [string, string] => {  // [sort key, heading]
    if (group === "priority") {
      const p = t.priority ?? "normal";
      return [String(PRIORITY_RANK[p]), `${p[0].toUpperCase()}${p.slice(1)} priority`];
    }
    if (group === "department") return [t.department_name ?? "~", t.department_name ?? "No department"];
    if (!t.due_date) return ["9999", "No deadline"];
    if (group === "date") {
      if (t.is_overdue) return ["0000", "Overdue"];
      return [t.due_date, t.due_date === today ? "Today" : new Date(`${t.due_date}T12:00:00`).toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "short" })];
    }
    const w = weekStart(t.due_date);
    if (w < thisWeek) return ["0000", "Earlier weeks (overdue)"];
    const label = w === thisWeek ? "This week" : `Week of ${new Date(`${w}T12:00:00`).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}`;
    return [w, label];
  };
  const groups = new Map<string, { label: string; rows: Task[] }>();
  for (const t of rows) {
    const [k, label] = key(t);
    if (!groups.has(k)) groups.set(k, { label, rows: [] });
    groups.get(k)!.rows.push(t);
  }
  return (
    <div className="space-y-4">
      {[...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, g]) => (
        <div key={k}>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">{g.label} <span className="font-normal">({g.rows.length})</span></h3>
          <div className="space-y-2">{g.rows.map((t) => <TaskRow key={t.id} t={t} box={box} />)}</div>
        </div>
      ))}
    </div>
  );
}

/** Overdue and soonest first (no deadline last), then higher priority, then newest. */
function byUrgency(a: Task, b: Task) {
  const due = (t: Task) => (t.due_date ? `${t.due_date}T${t.due_time ?? "23:59:59"}` : "9999");
  return due(a).localeCompare(due(b)) || PRIORITY_RANK[a.priority ?? "normal"] - PRIORITY_RANK[b.priority ?? "normal"] || (b.created_at ?? "").localeCompare(a.created_at ?? "");
}

/** What this person may move the task to from the list. "Send back" needs a reason, so it opens the task. */
function choices(t: Task): { value: Action | "open"; label: string }[] {
  const out: { value: Action | "open"; label: string }[] = [];
  if (t.can_take) out.push({ value: "take", label: "I'll take it" });
  if (t.can_do) {
    if (t.status === "todo") out.push({ value: "start", label: "In progress" });
    out.push({ value: "done", label: t.needs_check ? "Done (to check)" : "Done" });
    if (t.department_id) out.push({ value: "hand_back", label: "Hand back to the department" });
  }
  if (t.can_hand_out && !t.can_do) out.push({ value: "open", label: t.assigned_to_id ? "Give it to someone else..." : "Give it to someone..." });
  if (t.can_manage) {
    if (t.status === "to_check") out.push({ value: "accept", label: "Accept: done" }, { value: "open", label: "Send back..." });
    if (t.status === "todo" || t.status === "in_progress" || t.status === "to_check") out.push({ value: "cancel", label: "Cancel the task" });
    if (t.status === "done" || t.status === "cancelled") out.push({ value: "reopen", label: "Reopen" });
  } else if (t.for_self && t.status === "done") out.push({ value: "reopen", label: "Reopen" });
  return out;
}

const DONE: Record<Action, string> = { take: "It's yours", hand_back: "Handed back", start: "In progress", done: "Marked done", accept: "Accepted", return: "Sent back", cancel: "Cancelled", reopen: "Reopened" };

function TaskRow({ t, box }: { t: Task; box: Box }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const router = useRouter();
  const href = `/w/${slug}/tasks/${t.id}`;
  const act = useMutation({
    mutationFn: async (action: Action) => unwrap(await api.POST("/api/v1/w/{workspace}/tasks/{id}/action/", { params: { path: { workspace: slug, id: t.id } }, body: { action, note: "" } })),
    onSuccess: (_r, action) => { toast.success(DONE[action]); void qc.invalidateQueries({ queryKey: ["tasks", slug] }); },
    onError: (e) => toast.error(e.message),
  });
  const pick = async (value: string) => {
    if (value === "open") return router.push(href);
    if (value === "cancel" && !(await ask(`Cancel "${t.title}"?`))) return;
    if (value === "hand_back" && !(await ask(`Hand "${t.title}" back to ${t.department_name}? Someone else can then take it.`, { confirmLabel: "Hand back" }))) return;
    act.mutate(value as Action);
  };
  const options = choices(t);
  const st = t.in_pool ? { label: "Not taken", tone: "amber" as const } : TASK_STATUS[t.status ?? "todo"];
  return (
    <Card className={clsx("flex flex-wrap items-center justify-between gap-2 p-4 transition-colors hover:border-brand-300", t.is_overdue && "border-red-300")}>
      <Link href={href} className="min-w-0 flex-1">
        <p className="font-medium text-stone-900">{t.title}</p>
        <p className="text-sm text-stone-600">
          {box === "mine" ? (t.in_pool ? `${t.department_name}, from ${t.given_by_name}` : t.for_self ? "Your own" : `From ${t.given_by_name}${t.department_name ? `, for ${t.department_name}` : ""}`) : holder(t)} · <span className={t.is_overdue ? "font-medium text-red-700" : ""}>{dueLabel(t, fmtDate)}{t.is_overdue ? ", overdue" : ""}</span>
          {t.done_late && (t.status === "to_check" || t.status === "done") ? " · done late" : ""}
        </p>
      </Link>
      <div className="flex items-center gap-2">
        {t.priority === "high" && <Badge tone="red">High priority</Badge>}
        {options.length ? (
          <select aria-label="Change the status" value="" disabled={act.isPending} onChange={(e) => void pick(e.target.value)}
            className={clsx("rounded-full border px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500",
              st.tone === "green" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : st.tone === "blue" ? "border-sky-200 bg-sky-50 text-sky-800"
                : st.tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-stone-200 bg-stone-50 text-stone-700")}>
            <option value="" disabled>{act.isPending ? "Saving..." : st.label}</option>
            {options.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
          </select>
        ) : <Badge tone={st.tone}>{st.label}</Badge>}
      </div>
    </Card>
  );
}

/** How each department handles its tasks: given, waiting, how long until someone takes one, and how they end. */
function DepartmentRecord() {
  const { slug } = useWorkspace();
  const q = useQuery({ queryKey: ["task-departments", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/tasks/departments/", { params: { path: { workspace: slug } } })) });
  const rows = q.data ?? [];
  if (!rows.length) return null;
  return (
    <Card>
      <Table head={["Department", "Given", "Waiting", "Usually taken within", "Done on time", "Done late", "Handed back"]}>
        {rows.map((r) => (
          <tr key={r.department_id}>
            <Td className="font-medium">{r.department}</Td><Td className="text-right">{r.given}</Td>
            <Td className="text-right">{r.waiting ? <span className="font-medium text-amber-700">{r.waiting}</span> : 0}</Td>
            <Td>{r.median_hours_to_take == null ? "-" : r.median_hours_to_take < 1 ? "under an hour" : r.median_hours_to_take < 48 ? `${Math.round(r.median_hours_to_take)} hours` : `${Math.round(r.median_hours_to_take / 24)} days`}</Td>
            <Td className="text-right">{r.done_on_time}</Td><Td className="text-right">{r.done_late}</Td><Td className="text-right">{r.handed_back}</Td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

/** What a drop on a board column means for this task, if anything this person may do. */
function dropAction(t: Task, column: string): Action | null {
  if (column === "in_progress" && t.can_take) return "take";
  if (column === "in_progress" && t.can_do && t.status === "todo") return "start";
  if ((column === "to_check" || column === "done") && t.can_do) return "done";
  if (column === "done" && t.can_manage && t.status === "to_check") return "accept";
  if (column === "todo" && t.can_manage && (t.status === "done" || t.status === "cancelled")) return "reopen";
  return null;
}

const COLUMNS = [
  { key: "todo", label: "To do", has: (t: Task) => t.status === "todo" },
  { key: "in_progress", label: "In progress", has: (t: Task) => t.status === "in_progress" },
  { key: "to_check", label: "Done, to check", has: (t: Task) => t.status === "to_check" },
  { key: "done", label: "Done", has: (t: Task) => t.status === "done" },
] as const;

/** The same tasks as columns. Drag a card to move it, where you're allowed to; every card also keeps its status menu. */
function TaskBoard({ rows, box, showFinished }: { rows: Task[]; box: Box; showFinished: boolean }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const [over, setOver] = useState<string | null>(null);
  const act = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: Action }) =>
      unwrap(await api.POST("/api/v1/w/{workspace}/tasks/{id}/action/", { params: { path: { workspace: slug, id } }, body: { action, note: "" } })),
    onSuccess: (_r, v) => { toast.success(DONE[v.action]); void qc.invalidateQueries({ queryKey: ["tasks", slug] }); },
    onError: (e) => toast.error(e.message),
  });
  const columns = COLUMNS.filter((c) => c.key !== "done" || showFinished || rows.some(c.has));
  const drop = (column: string, id: string) => {
    setOver(null);
    const t = rows.find((r) => r.id === id);
    if (!t || COLUMNS.find((c) => c.key === column)?.has(t)) return;
    const action = dropAction(t, column);
    if (!action) { toast.error("You can't move this task there. Open it to see what you can do."); return; }
    act.mutate({ id, action });
  };
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((c) => {
        const cards = rows.filter(c.has);
        return (
          <section key={c.key} onDragOver={(e) => { e.preventDefault(); setOver(c.key); }} onDragLeave={() => setOver((o) => (o === c.key ? null : o))}
            onDrop={(e) => { e.preventDefault(); drop(c.key, e.dataTransfer.getData("text/plain")); }}
            className={clsx("min-h-40 rounded-lg border bg-stone-50 p-2 transition-colors", over === c.key ? "border-brand-400 bg-brand-50" : "border-stone-200")}>
            <h2 className="flex items-center justify-between px-1 pb-2 text-sm font-semibold text-stone-700">{c.label}<span className="text-xs font-normal text-stone-500">{cards.length}</span></h2>
            <div className="space-y-2">
              {cards.map((t) => (
                <div key={t.id} draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", t.id); e.dataTransfer.effectAllowed = "move"; }}
                  className="cursor-grab active:cursor-grabbing">
                  <BoardCard t={t} box={box} />
                </div>
              ))}
              {cards.length === 0 && <p className="px-1 py-4 text-center text-xs text-stone-400">Nothing here</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function BoardCard({ t, box }: { t: Task; box: Box }) {
  const { slug } = useWorkspace();
  const steps = t.checklist.length;
  const ticked = t.checklist.filter((i) => i.done).length;
  return (
    <Link href={`/w/${slug}/tasks/${t.id}`} className={clsx("block rounded-md border bg-white p-3 text-sm shadow-sm hover:border-brand-300", t.is_overdue ? "border-red-300" : "border-stone-200")}>
      <p className="font-medium text-stone-900">{t.title}</p>
      <p className="mt-0.5 text-xs text-stone-600">{box === "mine" ? (t.in_pool ? `${t.department_name}, not taken` : t.for_self ? "Your own" : `From ${t.given_by_name}`) : holder(t)}</p>
      <p className={clsx("mt-0.5 text-xs", t.is_overdue ? "font-medium text-red-700" : "text-stone-500")}>{dueLabel(t, fmtDate)}{t.is_overdue ? ", overdue" : ""}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
        {t.priority === "high" && <Badge tone="red">High</Badge>}
        {steps > 0 && <span>{ticked}/{steps} steps</span>}
        {t.comment_count > 0 && <span>{t.comment_count} comment{t.comment_count === 1 ? "" : "s"}</span>}
        {t.attachment_count > 0 && <span>{t.attachment_count} file{t.attachment_count === 1 ? "" : "s"}</span>}
        {t.project_name && <span className="truncate">· {t.project_name}</span>}
      </div>
    </Link>
  );
}
