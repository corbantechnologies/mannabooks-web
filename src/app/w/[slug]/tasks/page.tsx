"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { ask } from "@/components/confirm";
import { TASK_STATUS, type Task, TaskForm, dueLabel } from "@/components/task-form";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

type Box = "mine" | "given" | "all";
type Action = "start" | "done" | "accept" | "return" | "cancel" | "reopen";

/** Tasks: things to do by a date (and time), for yourself, your team, or any colleague. */
export default function TasksPage() {
  const { slug, can } = useWorkspace();
  const [box, setBox] = useState<Box>("mine");
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const q = useQuery({
    queryKey: ["tasks", slug, box, open],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/tasks/", { params: { path: { workspace: slug }, query: { box, open, page_size: 200 } as never } })),
  });
  const rows = q.data?.results ?? [];
  const tabs: { key: Box; label: string }[] = [{ key: "mine", label: "My tasks" }, { key: "given", label: "I gave" }, ...(can("tasks.view") ? [{ key: "all" as Box, label: "Everyone's" }] : [])];
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
        <label className="ml-auto flex items-center gap-2 pb-2 text-sm text-stone-600"><input type="checkbox" checked={!open} onChange={(e) => setOpen(!e.target.checked)} /> Show done and cancelled</label>
      </div>
      {q.isLoading ? <Spinner /> : q.error ? <ErrorState error={q.error} /> : rows.length === 0 ? (
        <Card><EmptyState title={box === "mine" ? "Nothing to do" : box === "given" ? "You haven't given anyone a task" : "No tasks"}>{box === "mine" ? "Add a task for yourself with New task." : undefined}</EmptyState></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((t) => <TaskRow key={t.id} t={t} box={box} />)}
        </div>
      )}
      {adding && <TaskForm onClose={() => setAdding(false)} />}
    </div>
  );
}

/** What this person may move the task to from the list. "Send back" needs a reason, so it opens the task. */
function choices(t: Task): { value: Action | "open"; label: string }[] {
  const out: { value: Action | "open"; label: string }[] = [];
  if (t.can_do) {
    if (t.status === "todo") out.push({ value: "start", label: "In progress" });
    out.push({ value: "done", label: t.needs_check ? "Done (to check)" : "Done" });
  }
  if (t.can_manage) {
    if (t.status === "to_check") out.push({ value: "accept", label: "Accept: done" }, { value: "open", label: "Send back..." });
    if (!t.for_self && (t.status === "todo" || t.status === "in_progress" || t.status === "to_check")) out.push({ value: "cancel", label: "Cancel the task" });
    if (t.status === "done" || t.status === "cancelled") out.push({ value: "reopen", label: "Reopen" });
  } else if (t.for_self && t.status === "done") out.push({ value: "reopen", label: "Reopen" });
  return out;
}

const DONE: Record<Action, string> = { start: "In progress", done: "Marked done", accept: "Accepted", return: "Sent back", cancel: "Cancelled", reopen: "Reopened" };

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
    act.mutate(value as Action);
  };
  const options = choices(t);
  const st = TASK_STATUS[t.status ?? "todo"];
  return (
    <Card className={clsx("flex flex-wrap items-center justify-between gap-2 p-4 transition-colors hover:border-brand-300", t.is_overdue && "border-red-300")}>
      <Link href={href} className="min-w-0 flex-1">
        <p className="font-medium text-stone-900">{t.title}</p>
        <p className="text-sm text-stone-600">
          {box === "mine" ? (t.for_self ? "Your own" : `From ${t.given_by_name}`) : t.assigned_to_name} · <span className={t.is_overdue ? "font-medium text-red-700" : ""}>{dueLabel(t, fmtDate)}{t.is_overdue ? ", overdue" : ""}</span>
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
            <option value="" disabled>{act.isPending ? "Saving..." : `${st.label} ▾`}</option>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : <Badge tone={st.tone}>{st.label}</Badge>}
      </div>
    </Card>
  );
}
