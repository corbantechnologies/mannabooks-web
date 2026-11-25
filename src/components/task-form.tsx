"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { ChecklistEditor } from "@/components/checklist-editor";
import { Button, Field, FormError, Input, Modal, Select, Textarea } from "@/components/ui";
import { DAY_STATUS } from "@/lib/attendance";
import { api, fieldError, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { useWorkspace, wsPath } from "@/lib/workspace";

export type Task = components["schemas"]["Task"];

export const TASK_STATUS: Record<string, { label: string; tone: "stone" | "blue" | "amber" | "green" | "red" }> = {
  todo: { label: "To do", tone: "amber" }, in_progress: { label: "In progress", tone: "blue" }, to_check: { label: "Done, to check", tone: "blue" },
  done: { label: "Done", tone: "green" }, cancelled: { label: "Cancelled", tone: "stone" },
};

/** "Due Fri 14 Nov by 15:00", "No deadline". */
/** Who has it: a person, or "Sales department, nobody yet". */
export function holder(t: Pick<Task, "assigned_to_name" | "department_name"> & { waiting_for_login?: boolean }) {
  if (t.waiting_for_login) return `${t.assigned_to_name} (no login yet: it's theirs when they join)`;
  if (t.assigned_to_name) return t.department_name ? `${t.assigned_to_name} (${t.department_name})` : t.assigned_to_name;
  return `${t.department_name} department, nobody has taken it yet`;
}

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
  const projects = useQuery({ queryKey: ["projects", slug, "pick"], retry: false,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/projects/", { params: { path: { workspace: slug }, query: { page_size: 200 } as never } })) });
  const customers = useQuery({ queryKey: ["customers", slug, "pick"], retry: false,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/customers/", { params: { path: { workspace: slug }, query: { page_size: 300 } as never } })) });
  // people who are in today come first, the lightest load at the top (attendance, when it is on)
  const IN = ["in", "on_break", "present", "half_day", "expected"];
  const list = [...(people.data?.people ?? [])].sort((a, b) => Number(b.is_me) - Number(a.is_me)
    || Number(IN.includes(b.today ?? "") ) - Number(IN.includes(a.today ?? "")) || a.open_tasks - b.open_tasks);
  const deps = people.data?.departments ?? [];
  const me = list.find((p) => p.is_me);
  const [chosen, setChosen] = useState<string[]>([]);
  const [chosenDeps, setChosenDeps] = useState<string[]>([]);
  const [chosenWaiting, setChosenWaiting] = useState<string[]>([]);
  const waiting = people.data?.waiting ?? [];
  const [f, setF] = useState({
    title: task?.title ?? "", details: task?.details ?? "", due_date: task?.due_date ?? "", due_time: task?.due_time?.slice(0, 5) ?? "",
    priority: task?.priority ?? "normal", needs_check: task?.needs_check ?? true,
    project_id: task?.project_id ?? "", customer_id: task?.customer_id ?? "", steps: "", opens_on: task?.opens_on ?? "",
  });
  const who = chosen.length || chosenDeps.length || chosenWaiting.length ? chosen : me ? [me.id] : [];
  const onlyMe = who.length === 1 && who[0] === me?.id;
  // someone ticked who is also in a ticked department would get the task twice: ask which
  const [clash, setClash] = useState<{ people: string[]; deps: string[] } | null>(null);
  const findClash = () => {
    const people = list.filter((p) => who.includes(p.id) && p.department_ids.some((d) => chosenDeps.includes(d)));
    if (!people.length) return null;
    return { people: people.map((p) => p.id), deps: [...new Set(people.flatMap((p) => p.department_ids.filter((d) => chosenDeps.includes(d))))] };
  };
  const submit = () => {
    const c = task ? null : findClash();
    if (c) setClash(c);
    else save.mutate(undefined);
  };
  const resolve = (keep: "departments" | "people" | "both") => {
    if (!clash) return;
    const people = keep === "departments" ? who.filter((id) => !clash.people.includes(id)) : who;
    const departments = keep === "people" ? chosenDeps.filter((d) => !clash.deps.includes(d)) : chosenDeps;
    setChosen(people);
    setChosenDeps(departments);
    setClash(null);
    save.mutate({ people, departments });
  };
  const save = useMutation({
    mutationFn: async (picked?: { people: string[]; departments: string[] }) => {
      const { steps, ...rest } = f;
      const body = { ...rest, opens_on: f.opens_on || null, due_date: f.due_date || null, due_time: f.due_time || null, project_id: f.project_id || null, customer_id: f.customer_id || null,
        ...(task ? {} : { checklist: steps.split(/\r?\n/).map((x) => x.trim()).filter(Boolean) }) };
      if (task) return [unwrap(await api.PATCH("/api/v1/w/{workspace}/tasks/{id}/", { params: { path: { workspace: slug, id: task.id } }, body: body as never }))];
      return unwrap(await api.POST("/api/v1/w/{workspace}/tasks/", { ...wsPath(slug), body: { ...body, assignee_ids: picked?.people ?? who, department_ids: picked?.departments ?? chosenDeps, employee_ids: chosenWaiting } as never })) as unknown as Task[];
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
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Field label="Task" error={fieldError(save.error, "title")}><Input required autoFocus value={f.title} onChange={set("title")} placeholder="Collect the signed lease from the landlord" /></Field>
        <Field label="Details"><Textarea rows={3} value={f.details} onChange={set("details")} placeholder="Where, who to see, what done looks like." /></Field>
        {!task && <Field label="Checklist (optional)" hint="Press Enter for the next step. Each becomes a box they tick off as they go."><ChecklistEditor value={f.steps} onChange={(v) => setF((p) => ({ ...p, steps: v }))} /></Field>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Project (optional)"><Select value={f.project_id} onChange={set("project_id")}><option value="">None</option>{(projects.data?.results ?? []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
          <Field label="Customer (optional)"><Select value={f.customer_id} onChange={set("customer_id")}><option value="">None</option>{(customers.data?.results ?? []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
        </div>
        {!task && (
          <Field label="Who does it" hint={list.length <= 1 && !deps.length ? "You can give tasks to yourself and to the people below you in the reporting line."
            : "Choose people (each gets their own task) or a department (anyone in it takes it). None chosen: it's yours."}>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-stone-200 p-2">
              {deps.length > 0 && <p className="px-2 pt-1 text-xs font-semibold uppercase text-stone-500">A department</p>}
              {deps.map((d) => (
                <label key={d.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-stone-50">
                  <input type="checkbox" checked={chosenDeps.includes(d.id)} onChange={(e) => setChosenDeps((c) => (e.target.checked ? [...c, d.id] : c.filter((x) => x !== d.id)))} />
                  {d.name} department<span className="text-xs text-stone-500">{d.people} {d.people === 1 ? "person" : "people"}, anyone can take it</span>
                </label>
              ))}
              {deps.length > 0 && <p className="px-2 pt-2 text-xs font-semibold uppercase text-stone-500">People</p>}
              {list.map((p) => (
                <label key={p.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-stone-50">
                  <input type="checkbox" checked={who.includes(p.id)} onChange={(e) => setChosen((c) => {
                    const base = c.length || chosenDeps.length || chosenWaiting.length ? c : me ? [me.id] : [];
                    return e.target.checked ? [...base, p.id] : base.filter((x) => x !== p.id);
                  })} />
                  {p.is_me ? `Me (${p.full_name})` : p.full_name}{p.job_title && <span className="text-xs text-stone-500">{p.job_title}</span>}
                  <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-stone-500">
                    {p.today && DAY_STATUS[p.today] && <span className={p.today === "in" || p.today === "on_break" || p.today === "present" ? "text-emerald-700" : p.today === "absent" || p.today === "on_leave" || p.today === "not_in_yet" ? "text-amber-700" : ""}>{DAY_STATUS[p.today][0]}</span>}
                    {p.active_now && <span className="h-2 w-2 rounded-full bg-emerald-500" title="Active now" />}
                    <span title="Open tasks">{p.open_tasks} open</span>
                  </span>
                </label>
              ))}
              {waiting.length > 0 && <p className="px-2 pt-2 text-xs font-semibold uppercase text-stone-500">No login yet: the task waits until they join</p>}
              {waiting.map((w) => (
                <label key={w.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-stone-50">
                  <input type="checkbox" checked={chosenWaiting.includes(w.id)} onChange={(e) => setChosenWaiting((c) => (e.target.checked ? [...c, w.id] : c.filter((x) => x !== w.id)))} />
                  {w.full_name}{w.job_title && <span className="text-xs text-stone-500">{w.job_title}</span>}
                </label>
              ))}
            </div>
          </Field>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          {/* phone date pickers' "Reset" puts back the date just picked, so clearing it needs our own button */}
          <Field label="Due on" hint={f.due_date ? undefined : "Blank: no deadline."}>
            <Input type="date" value={f.due_date} onChange={set("due_date")} />
            {f.due_date && <button type="button" className="mt-1 text-xs text-brand-700 hover:underline" onClick={() => setF((p) => ({ ...p, due_date: "", due_time: "" }))}>Clear: no deadline</button>}
          </Field>
          <Field label="By (time)" hint="Blank: end of the day." error={fieldError(save.error, "due_time")}><Input type="time" value={f.due_time} disabled={!f.due_date} onChange={set("due_time")} /></Field>
          <Field label="Priority"><Select value={f.priority} onChange={set("priority")}><option value="normal">Normal</option><option value="high">High</option><option value="low">Low</option></Select></Field>
          <Field label="Opens on (optional)" hint="Locked until then: they see it but can't start it.">
            <Input type="date" value={f.opens_on} onChange={set("opens_on")} />
          </Field>
        </div>
        {!(task ? task.for_self : onlyMe) && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={f.needs_check} onChange={(e) => setF((p) => ({ ...p, needs_check: e.target.checked }))} />
            <span>I&apos;ll check it when it&apos;s done<span className="block text-xs text-stone-500">Off: when they mark it done, it is done.</span></span>
          </label>
        )}
        {clash && (() => {
          const names = list.filter((p) => clash.people.includes(p.id)).map((p) => (p.is_me ? "You" : p.full_name));
          const depNames = deps.filter((d) => clash.deps.includes(d.id)).map((d) => d.name);
          const isAre = names.length === 1 && names[0] !== "You" ? "is" : "are";
          return (
            <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p>{names.join(", ")} {isAre} in {depNames.join(", ")}. Giving it to both makes two tasks for the same job. Give it to:</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => resolve("departments")}>{depNames.join(", ")} only</Button>
                <Button type="button" variant="secondary" onClick={() => resolve("people")}>{names.join(", ")} only</Button>
                <Button type="button" variant="ghost" onClick={() => resolve("both")}>Both, on purpose</Button>
              </div>
            </div>
          );
        })()}
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>{task ? "Save" : "Give the task"}</Button></div>
      </form>
    </Modal>
  );
}
