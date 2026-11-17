"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Field, FormError, Input, Modal, Select, Textarea } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { useWorkspace, wsPath } from "@/lib/workspace";

export type Task = components["schemas"]["Task"];

export const TASK_STATUS: Record<string, { label: string; tone: "stone" | "blue" | "amber" | "green" | "red" }> = {
  todo: { label: "To do", tone: "amber" }, in_progress: { label: "In progress", tone: "blue" }, to_check: { label: "Done, to check", tone: "blue" },
  done: { label: "Done", tone: "green" }, cancelled: { label: "Cancelled", tone: "stone" },
};

/** "Due Fri 14 Nov by 15:00", "No deadline". */
export function dueLabel(t: Pick<Task, "due_date" | "due_time">, fmtDate: (d: string) => string) {
  if (!t.due_date) return "No deadline";
  return `Due ${fmtDate(t.due_date)}${t.due_time ? ` by ${t.due_time.slice(0, 5)}` : ""}`;
}

/** Give a task to yourself, someone in your team, or (with the right) any colleague; or change one you gave. */
export function TaskForm({ task, onClose }: { task?: Task; onClose: () => void }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const people = useQuery({
    queryKey: ["task-people", slug], enabled: !task,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/tasks/people/", wsPath(slug))),
  });
  const list = people.data ?? [];
  const me = list.find((p) => p.is_me);
  const [chosen, setChosen] = useState<string[]>([]);
  const [f, setF] = useState({
    title: task?.title ?? "", details: task?.details ?? "", due_date: task?.due_date ?? "", due_time: task?.due_time?.slice(0, 5) ?? "",
    priority: task?.priority ?? "normal", needs_check: task?.needs_check ?? true,
  });
  const who = chosen.length ? chosen : me ? [me.id] : [];
  const onlyMe = who.length === 1 && who[0] === me?.id;
  const save = useMutation({
    mutationFn: async () => {
      const body = { ...f, due_date: f.due_date || null, due_time: f.due_time || null };
      if (task) return [unwrap(await api.PATCH("/api/v1/w/{workspace}/tasks/{id}/", { params: { path: { workspace: slug, id: task.id } }, body: body as never }))];
      return unwrap(await api.POST("/api/v1/w/{workspace}/tasks/", { ...wsPath(slug), body: { ...body, assignee_ids: who } as never })) as unknown as Task[];
    },
    onSuccess: (made) => {
      toast.success(task ? "Task changed" : made.length > 1 ? `${made.length} tasks given` : onlyMe ? "Added to your tasks" : "Task given");
      void qc.invalidateQueries({ queryKey: ["tasks", slug] });
      void qc.invalidateQueries({ queryKey: ["task", slug] });
      onClose();
    },
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  return (
    <Modal open title={task ? "Change the task" : "New task"} onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Field label="Task" error={fieldError(save.error, "title")}><Input required autoFocus value={f.title} onChange={set("title")} placeholder="Collect the signed lease from the landlord" /></Field>
        <Field label="Details"><Textarea rows={3} value={f.details} onChange={set("details")} placeholder="Where, who to see, what done looks like." /></Field>
        {!task && (
          <Field label="Who does it" hint={list.length <= 1 ? "You can give tasks to yourself and to the people below you in the reporting line." : "Choose one or more: each gets their own task. None chosen: it's yours."}>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-stone-200 p-2">
              {list.map((p) => (
                <label key={p.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-stone-50">
                  <input type="checkbox" checked={who.includes(p.id)} onChange={(e) => setChosen((c) => {
                    const base = c.length ? c : me ? [me.id] : [];
                    return e.target.checked ? [...base, p.id] : base.filter((x) => x !== p.id);
                  })} />
                  {p.is_me ? `Me (${p.full_name})` : p.full_name}{p.job_title && <span className="text-xs text-stone-500">{p.job_title}</span>}
                </label>
              ))}
            </div>
          </Field>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Due on" hint="Blank: no deadline."><Input type="date" value={f.due_date} onChange={set("due_date")} /></Field>
          <Field label="By (time)" hint="Blank: end of the day." error={fieldError(save.error, "due_time")}><Input type="time" value={f.due_time} disabled={!f.due_date} onChange={set("due_time")} /></Field>
          <Field label="Priority"><Select value={f.priority} onChange={set("priority")}><option value="normal">Normal</option><option value="high">High</option><option value="low">Low</option></Select></Field>
        </div>
        {!(task ? task.for_self : onlyMe) && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={f.needs_check} onChange={(e) => setF((p) => ({ ...p, needs_check: e.target.checked }))} />
            <span>I&apos;ll check it when it&apos;s done<span className="block text-xs text-stone-500">Off: when they mark it done, it is done.</span></span>
          </label>
        )}
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>{task ? "Save" : "Give the task"}</Button></div>
      </form>
    </Modal>
  );
}
