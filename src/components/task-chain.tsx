"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Hourglass, Paperclip } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, EmptyState, Field, FormError, Input, Modal, Select, Spinner, Table, Td, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { fmtDate, todayIso } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

type Task = components["schemas"]["Task"];
type Action = "hold" | "resume" | "ask_deadline" | "approve_deadline" | "decline_deadline";

function hours(h: number): string {
  if (h < 1) return "under an hour";
  if (h < 24) return `${Math.round(h)} ${Math.round(h) === 1 ? "hour" : "hours"}`;
  const d = Math.round(h / 24);
  return `${d} ${d === 1 ? "day" : "days"}`;
}

function useTaskAction(task: Task, onDone: () => void) {
  const { slug } = useWorkspace();
  return useMutation({
    mutationFn: async (body: { action: Action; note?: string; to_id?: string; waiting_on_name?: string; new_date?: string }) =>
      unwrap(await api.POST("/api/v1/w/{workspace}/tasks/{id}/action/", { params: { path: { workspace: slug, id: task.id } }, body: { note: "", ...body } })),
    onSuccess: onDone,
  });
}

/** Waiting on someone: the open wait with Resume, the button to start one, and the time it has waited in all. */
export function TaskWaiting({ task, onChange }: { task: Task; onChange: () => void }) {
  const [holding, setHolding] = useState(false);
  const [note, setNote] = useState("");
  const act = useTaskAction(task, () => { setNote(""); onChange(); });
  const w = task.waiting;
  const open = task.status === "todo" || task.status === "in_progress";
  if (!w && !(task.can_do && open) && !task.holds.length) return null;
  return (
    <>
      {w ? (
        <Card className="space-y-2 border-amber-300 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900"><Hourglass className="h-4 w-4" /> Waiting on {w.waiting_on} since {fmtDate(w.started_at)} ({hours(w.hours)})</p>
          <p className="text-sm text-amber-900">{w.reason}</p>
          {task.can_resume && (
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Note (optional)"><Input className="w-72" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Signed and sent back" /></Field>
              <Button loading={act.isPending} onClick={() => act.mutate({ action: "resume", note })}>{w.waiting_on_id && !task.can_do ? "I've done my part" : "Resume"}</Button>
            </div>
          )}
          <FormError error={act.error} />
        </Card>
      ) : task.can_do && open && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Button variant="secondary" onClick={() => setHolding(true)}><Hourglass className="h-4 w-4" /> Waiting on someone</Button>
          <span className="text-stone-500">Can&apos;t go on until someone else does their part? Say who: they&apos;re told, and the time counts.</span>
        </div>
      )}
      {task.holds.length > 0 && (
        <details className="text-sm text-stone-600">
          <summary className="cursor-pointer">Waited {hours(task.hold_hours)} in all, {task.holds.length} {task.holds.length === 1 ? "time" : "times"}</summary>
          <ul className="mt-1 space-y-0.5 pl-4">
            {task.holds.map((h) => (
              <li key={h.id}>{fmtDate(h.started_at)}: on {h.waiting_on}, {h.reason}{h.ended_at ? ` · ${hours(h.hours)}${h.ended_note ? ` (${h.ended_note})` : ""}` : " · still waiting"}</li>
            ))}
          </ul>
        </details>
      )}
      {holding && <HoldForm task={task} onClose={() => setHolding(false)} onDone={() => { setHolding(false); onChange(); }} />}
    </>
  );
}

function HoldForm({ task, onClose, onDone }: { task: Task; onClose: () => void; onDone: () => void }) {
  const { slug } = useWorkspace();
  const people = useQuery({ queryKey: ["task-colleagues", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/tasks/colleagues/", { params: { path: { workspace: slug } } })) });
  const [who, setWho] = useState("");
  const [outside, setOutside] = useState("");
  const [reason, setReason] = useState("");
  const act = useTaskAction(task, () => { toast.success("Marked as waiting"); onDone(); });
  return (
    <Modal open title="Waiting on someone" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); act.mutate({ action: "hold", note: reason, ...(who && who !== "outside" ? { to_id: who } : { waiting_on_name: outside }) }); }}>
        <Field label="Who">
          <Select required value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">Choose</option>
            {(people.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            <option value="outside">Someone outside the business</option>
          </Select>
        </Field>
        {who === "outside" && <Field label="Who outside"><Input required maxLength={120} value={outside} onChange={(e) => setOutside(e.target.value)} placeholder="e.g. The bank, the supplier" /></Field>}
        <Field label="What you're waiting for"><Textarea required rows={2} maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. The signed quote" /></Field>
        <p className="text-xs text-stone-500">A colleague is told, and reminded every two days. Marking the task done ends the wait too.</p>
        <FormError error={act.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={act.isPending}>Save</Button></div>
      </form>
    </Modal>
  );
}

/** Asking for more time (the person doing it), and deciding (whoever gave it). */
export function TaskDeadline({ task, onChange }: { task: Task; onChange: () => void }) {
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const act = useTaskAction(task, () => { setNote(""); onChange(); });
  const pending = task.deadline_requests.find((r) => r.status === "pending");
  const open = task.status === "todo" || task.status === "in_progress";
  return (
    <>
      {pending && (
        <Card className="space-y-2 p-4">
          <p className="text-sm"><span className="font-semibold">{pending.asked_by_name} asks to move the deadline</span> from {pending.old_date ? fmtDate(pending.old_date) : "none"} to <span className="font-semibold">{fmtDate(pending.new_date)}</span>: {pending.reason}</p>
          {task.can_manage ? (
            <div className="flex flex-wrap items-end justify-end gap-2">
              <Field label="Note" hint="Needed to decline."><Input className="w-72" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              <Button variant="secondary" loading={act.isPending && act.variables?.action === "decline_deadline"} onClick={() => act.mutate({ action: "decline_deadline", note })}>Decline</Button>
              <Button loading={act.isPending && act.variables?.action === "approve_deadline"} onClick={() => act.mutate({ action: "approve_deadline", note })}>Move it</Button>
            </div>
          ) : <p className="text-xs text-stone-500">Waiting for {task.given_by_name} to decide.</p>}
          <FormError error={act.error} />
        </Card>
      )}
      {!pending && task.can_do && open && !task.for_self && task.given_by_name && (
        <button type="button" className="text-sm text-brand-700 hover:underline" onClick={() => setAsking(true)}>Ask {task.given_by_name} for more time</button>
      )}
      {task.deadline_requests.filter((r) => r.status !== "pending").slice(-1).map((r) => (
        <p key={r.id} className={clsx("text-xs", r.status === "approved" ? "text-emerald-700" : "text-stone-500")}>
          Asked {fmtDate(r.created_at)} for {fmtDate(r.new_date)}: {r.status === "approved" ? `moved by ${r.decided_by_name}` : `declined by ${r.decided_by_name}${r.decision_note ? ` (${r.decision_note})` : ""}`}
        </p>
      ))}
      {asking && <AskDeadline task={task} onClose={() => setAsking(false)} onDone={() => { setAsking(false); onChange(); }} />}
    </>
  );
}

function AskDeadline({ task, onClose, onDone }: { task: Task; onClose: () => void; onDone: () => void }) {
  const [date, setDate] = useState("");
  const [why, setWhy] = useState("");
  const act = useTaskAction(task, () => { toast.success(`Asked ${task.given_by_name}`); onDone(); });
  return (
    <Modal open title="Ask for more time" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); act.mutate({ action: "ask_deadline", note: why, new_date: date }); }}>
        <p className="text-sm text-stone-600">Now due {task.due_date ? fmtDate(task.due_date) : "with no date"}. {task.given_by_name} decides.</p>
        <Field label="New date"><Input type="date" required min={task.due_date && task.due_date > todayIso() ? task.due_date : todayIso()} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Why it needs more time"><Textarea required rows={2} maxLength={255} value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
        <FormError error={act.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={act.isPending}>Ask</Button></div>
      </form>
    </Modal>
  );
}

/** "Needs a file back": what the person doing it must upload before the task can be done. */
export function TaskFileBack({ task }: { task: Task }) {
  if (!task.needs_file) return null;
  return (
    <p className={clsx("flex items-center gap-2 rounded-md px-3 py-2 text-sm", task.file_back ? "bg-emerald-50 text-emerald-800" : "bg-sky-50 text-sky-900")}>
      <Paperclip className="h-4 w-4 shrink-0" />
      {task.file_back ? "The file has come back." : task.can_do
        ? "This task needs a file back: download what's attached, do what's asked (sign, fill in), and upload it under Files before marking it done."
        : `Waiting for ${task.assigned_to_name ?? "the person doing it"} to upload a file back.`}
    </p>
  );
}

/** The Waiting tab: tasks waiting on you, and who's holding things up on the tasks you can see. */
export function TasksWaiting() {
  const { slug } = useWorkspace();
  const mine = useQuery({ queryKey: ["task-holds", slug, "mine"], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/tasks/holds/", { params: { path: { workspace: slug }, query: { scope: "mine" } } })) });
  const seen = useQuery({ queryKey: ["task-holds", slug, "seen"], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/tasks/holds/", { params: { path: { workspace: slug }, query: { scope: "seen" } } })) });
  if (mine.isLoading || seen.isLoading) return <Spinner />;
  const m = mine.data, s = seen.data;
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="border-b border-stone-100 px-4 py-2 text-sm font-semibold">Waiting on you</h2>
        {!m?.open.length ? <p className="p-4 text-sm text-stone-500">Nothing is waiting on you.</p> : (
          <Table head={["Task", "Who's doing it", "Waiting for", "Since", "Due"]}>
            {m.open.map((h) => (
              <tr key={h.task_id}>
                <Td><Link className="font-medium text-brand-700 hover:underline" href={`/w/${slug}/tasks/${h.task_id}`}>{h.title}</Link></Td>
                <Td>{h.doing_it}</Td><Td className="text-sm">{h.reason}</Td>
                <Td className={h.days >= 2 ? "text-red-700" : ""}>{fmtDate(h.since)}{h.days > 0 && <span className="block text-xs">{h.days} days</span>}</Td>
                <Td>{h.due_date ? fmtDate(h.due_date) : "-"}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Card>
        <div className="border-b border-stone-100 px-4 py-2"><h2 className="text-sm font-semibold">Who&apos;s holding things up</h2>
          <p className="text-xs text-stone-500">On the tasks you can see: what waits on each person now, and how long tasks waited on them this month.</p></div>
        {!s?.people.length ? <EmptyState title="Nothing waiting this month" /> : (
          <Table head={["Who", "Waiting on them now", "Oldest since", "Hours this month"]}>
            {s.people.map((p) => (
              <tr key={p.who}>
                <Td className="font-medium">{p.who}</Td>
                <Td className={clsx("text-right", p.open > 0 && "font-semibold text-amber-800")}>{p.open}</Td>
                <Td>{p.oldest_since ? fmtDate(p.oldest_since) : "-"}</Td>
                <Td className="text-right font-mono">{p.hours_this_month}</Td>
              </tr>
            ))}
          </Table>
        )}
        {(s?.open.length ?? 0) > 0 && (
          <ul className="divide-y divide-stone-100 border-t border-stone-100">
            {s!.open.map((h) => (
              <li key={h.task_id} className="flex flex-wrap items-center gap-x-3 px-4 py-2 text-sm">
                <Link className="font-medium text-brand-700 hover:underline" href={`/w/${slug}/tasks/${h.task_id}`}>{h.title}</Link>
                <span className="text-stone-600">{h.doing_it} is waiting on {h.waiting_on}: {h.reason}</span>
                <span className={clsx("ml-auto text-xs", h.days >= 2 ? "text-red-700" : "text-stone-500")}>{h.days ? `${h.days} days` : "today"}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
