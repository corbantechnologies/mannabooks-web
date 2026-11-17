"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { TASK_STATUS, TaskForm, dueLabel } from "@/components/task-form";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

type Box = "mine" | "given" | "all";

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
        description="Things to do by a date, and a time if it matters. For yourself, the people below you, or any colleague if your role allows. For reports and tasks that repeat, use Reports and tasks."
        actions={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> New task</Button>} />
      <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-stone-200">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setBox(t.key)} className={clsx("-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm", box === t.key ? "border-brand-700 font-medium text-brand-800" : "border-transparent text-stone-500 hover:text-stone-800")}>{t.label}</button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 pb-2 text-sm text-stone-600"><input type="checkbox" checked={!open} onChange={(e) => setOpen(!e.target.checked)} /> Show done and cancelled</label>
      </div>
      {q.isLoading ? <Spinner /> : q.error ? <ErrorState error={q.error} /> : rows.length === 0 ? (
        <Card><EmptyState title={box === "mine" ? "Nothing to do" : box === "given" ? "You haven't given anyone a task" : "No tasks"}>{box === "mine" ? "Add a task for yourself with New task." : undefined}</EmptyState></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((t) => (
            <Link key={t.id} href={`/w/${slug}/tasks/${t.id}`} className="block">
              <Card className={clsx("flex flex-wrap items-center justify-between gap-2 p-4 transition-colors hover:border-brand-300", t.is_overdue && "border-red-300")}>
                <div className="min-w-0">
                  <p className="font-medium text-stone-900">{t.title}</p>
                  <p className="text-sm text-stone-600">
                    {box === "mine" ? (t.for_self ? "Your own" : `From ${t.given_by_name}`) : t.assigned_to_name} · <span className={t.is_overdue ? "font-medium text-red-700" : ""}>{dueLabel(t, fmtDate)}{t.is_overdue ? ", overdue" : ""}</span>
                    {t.done_late && t.status !== "todo" && t.status !== "in_progress" ? " · done late" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {t.priority === "high" && <Badge tone="red">High priority</Badge>}
                  <Badge tone={TASK_STATUS[t.status ?? "todo"].tone}>{TASK_STATUS[t.status ?? "todo"].label}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      {adding && <TaskForm onClose={() => setAdding(false)} />}
    </div>
  );
}
