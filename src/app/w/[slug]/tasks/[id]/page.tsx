"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { TASK_STATUS, TaskForm, dueLabel } from "@/components/task-form";
import { TaskChecklist, TaskComments, TaskFiles } from "@/components/task-work";
import { Badge, Button, Card, ErrorState, Field, FormError, Select, Spinner, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

const DONE_MESSAGE: Record<string, string> = {
  take: "It's yours", hand_back: "Handed back to the department", assign: "Given to them", start: "Marked in progress", done: "Marked done", accept: "Accepted", return: "Sent back", cancel: "Cancelled", reopen: "Reopened",
};

export default function TaskPage() {
  const { slug } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const path = { params: { path: { workspace: slug, id } } };
  const q = useQuery({ queryKey: ["task", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/tasks/{id}/", path)) });
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [to, setTo] = useState("");
  const people = useQuery({
    queryKey: ["task-people", slug], enabled: Boolean(q.data?.can_hand_out),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/tasks/people/", { params: { path: { workspace: slug } } })),
  });
  const act = useMutation({
    mutationFn: async (action: "take" | "hand_back" | "assign" | "start" | "done" | "accept" | "return" | "cancel" | "reopen") =>
      unwrap(await api.POST("/api/v1/w/{workspace}/tasks/{id}/action/", { ...path, body: { action, note, to_id: action === "assign" ? to : undefined } })),
    onSuccess: (_t, action) => { toast.success(DONE_MESSAGE[action]); setNote(""); void q.refetch(); },
  });
  if (q.isLoading) return <Spinner />;
  if (q.error) return <ErrorState error={q.error} />;
  const t = q.data!;
  const st = TASK_STATUS[t.status ?? "todo"];
  return (
    <div className="w-full max-w-3xl space-y-4">
      <Link href={`/w/${slug}/tasks`} className="text-sm text-stone-500 hover:underline">&larr; Tasks</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t.title}</h1>
          <p className="text-sm text-stone-600">
            {t.for_self ? `${t.assigned_to_name}'s own task`
              : t.department_name ? `${t.given_by_name} gave it to ${t.department_name}${t.assigned_to_name ? `, ${t.assigned_to_name} has it` : ", nobody has taken it yet"}`
              : `${t.given_by_name} gave it to ${t.assigned_to_name}`} · <span className={t.is_overdue ? "font-medium text-red-700" : ""}>{dueLabel(t, fmtDate)}{t.is_overdue ? ", overdue" : ""}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {t.priority !== "normal" && <Badge tone={t.priority === "high" ? "red" : "stone"}>{t.priority === "high" ? "High priority" : "Low priority"}</Badge>}
          <Badge tone={st.tone}>{st.label}</Badge>
          {t.can_manage && (t.status === "todo" || t.status === "in_progress") && <Button variant="secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Change</Button>}
        </div>
      </div>

      {(t.project_name || t.customer_name) && (
        <p className="flex flex-wrap gap-3 text-sm text-stone-600">
          {t.project_name && <Link className="hover:underline" href={`/w/${slug}/projects/${t.project_id}`}>Project: {t.project_name}</Link>}
          {t.customer_name && <Link className="hover:underline" href={`/w/${slug}/sales/customers/${t.customer_id}`}>Customer: {t.customer_name}</Link>}
        </p>
      )}
      {t.details && <Card className="p-4"><p className="whitespace-pre-line text-sm text-stone-700">{t.details}</p></Card>}
      <TaskChecklist task={t} onChange={() => void q.refetch()} />
      {t.status === "in_progress" && t.check_comment && t.checked_by_name && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800"><span className="font-medium">{t.checked_by_name} sent it back:</span> {t.check_comment}</p>
      )}
      {t.done_at && (
        <Card className="space-y-1 p-4 text-sm">
          <p className="text-stone-500">Marked done {fmtDate(t.done_at)}{t.done_late ? " (after its due time)" : ""}{t.started_at ? `, started ${fmtDate(t.started_at)}` : ""}</p>
          {t.done_note && <p className="whitespace-pre-line text-stone-800">{t.done_note}</p>}
          {t.status === "done" && t.checked_by_name && <p className="text-emerald-700">Accepted by {t.checked_by_name}{t.check_comment ? `: ${t.check_comment}` : ""}</p>}
        </Card>
      )}

      {t.can_take && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-stone-700">This is for {t.department_name}. Anyone in it can take it.</p>
          <Button loading={act.isPending && act.variables === "take"} onClick={() => act.mutate("take")}>I&apos;ll take it</Button>
        </Card>
      )}

      {t.can_hand_out && (
        <Card className="space-y-2 p-4">
          <h2 className="text-sm font-semibold">{t.assigned_to_name ? "Give it to someone else" : "Give it to someone in the department"}</h2>
          <div className="flex flex-wrap gap-2">
            <Select value={to} onChange={(e) => setTo(e.target.value)} className="min-w-56">
              <option value="">Choose</option>
              {(people.data?.people ?? []).filter((p) => p.id !== t.assigned_to_id).map((p) => <option key={p.id} value={p.id}>{p.is_me ? `Me (${p.full_name})` : p.full_name}</option>)}
            </Select>
            <Button variant="secondary" disabled={!to} loading={act.isPending && act.variables === "assign"} onClick={() => act.mutate("assign")}>Give it to them</Button>
          </div>
        </Card>
      )}

      {t.can_do && (
        <Card className="space-y-3 p-4">
          <Field label="Note (optional)" hint={t.needs_check ? `${t.given_by_name} checks it after you mark it done.` : undefined}>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was done, where it is, what's left." />
          </Field>
          <div className="flex flex-wrap justify-end gap-2">
            {t.department_id && <Button variant="ghost" loading={act.isPending && act.variables === "hand_back"} onClick={() => act.mutate("hand_back")}>Hand back to {t.department_name}</Button>}
            {t.status === "todo" && <Button variant="secondary" loading={act.isPending && act.variables === "start"} onClick={() => act.mutate("start")}>I&apos;ve started</Button>}
            <Button loading={act.isPending && act.variables === "done"} onClick={() => act.mutate("done")}>Mark done</Button>
          </div>
        </Card>
      )}

      {t.can_manage && t.status === "to_check" && (
        <Card className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">Check it</h2>
          <Field label="Comment" hint="Needed if you send it back."><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" loading={act.isPending && act.variables === "return"} onClick={() => act.mutate("return")}>Send back</Button>
            <Button loading={act.isPending && act.variables === "accept"} onClick={() => act.mutate("accept")}>Accept</Button>
          </div>
        </Card>
      )}

      {t.can_manage && (
        <div className="flex justify-end gap-2">
          {(t.status === "todo" || t.status === "in_progress" || t.status === "to_check") && <Button variant="ghost" className="text-red-600" onClick={() => act.mutate("cancel")}>Cancel the task</Button>}
          {(t.status === "done" || t.status === "cancelled") && <Button variant="ghost" onClick={() => act.mutate("reopen")}>Reopen</Button>}
        </div>
      )}
      {t.events.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold">Who has held it</h2>
          <ul className="space-y-1 text-sm text-stone-700">
            <li className="text-stone-500">{fmtDate(t.created_at)}: given to {t.department_name} by {t.given_by_name}</li>
            {t.events.map((e, i) => (
              <li key={i}>{fmtDate(e.at)}: {e.kind === "assigned" ? `${e.by_name} gave it to ${e.person}` : `${e.person} ${e.kind === "taken" ? "took it" : "handed it back"}`}</li>
            ))}
          </ul>
        </Card>
      )}
      <FormError error={act.error} />
      <TaskFiles task={t} />
      <TaskComments task={t} />
      {editing && <TaskForm task={t} onClose={() => { setEditing(false); void q.refetch(); }} />}
    </div>
  );
}
