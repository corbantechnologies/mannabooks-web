"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Plus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { ACTIVITY_KINDS, fromLocalInput, useAssignees } from "@/lib/api/crm";
import { api, fieldError, unwrap } from "@/lib/api/client";
import type { Activity } from "@/lib/api/types";
import { useWorkspace, wsPath } from "@/lib/workspace";

import { Badge, Button, Card, Field, FormError, Input, Select, Textarea } from "./ui";

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "");

/** One follow-up row: tick it done, see who has it and when it is due. */
export function ActivityRow({ a, showLink = false }: { a: Activity; showLink?: boolean }) {
  const { slug, can } = useWorkspace();
  const toggle = useMutation({
    mutationFn: async () => unwrap(await api.PATCH("/api/v1/w/{workspace}/activities/{id}/", { params: { path: { workspace: slug, id: a.id } }, body: { done: !a.done } })),
  });
  const kind = ACTIVITY_KINDS.find(([k]) => k === a.kind)?.[1] ?? a.kind;
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <button type="button" disabled={!can("crm.manage") || a.kind === "note" || toggle.isPending} onClick={() => toggle.mutate()}
        aria-label={a.done ? "Mark not done" : "Mark done"} className="mt-0.5 text-stone-400 hover:text-brand-600 disabled:cursor-default">
        {a.done ? <CheckCircle2 className="h-5 w-5 text-brand-600" /> : <Circle className="h-5 w-5" />}
      </button>
      <div className="min-w-0 flex-1 text-sm">
        <p className={a.done && a.kind !== "note" ? "text-stone-400 line-through" : "font-medium text-stone-900"}>
          {a.subject} <Badge>{kind}</Badge> {a.overdue && <Badge tone="red">Overdue</Badge>}
        </p>
        {a.notes && <p className="mt-0.5 whitespace-pre-line text-stone-600">{a.notes}</p>}
        <p className="mt-0.5 text-xs text-stone-500">
          {[a.assigned_to_name, a.due_at && !a.done ? `due ${when(a.due_at)}` : null, a.done_at ? `${a.kind === "note" ? "noted" : "done"} ${when(a.done_at)}` : null,
            showLink ? (a.deal_title ?? a.lead_name ?? a.customer_name) : null].filter(Boolean).join(" · ")}
        </p>
      </div>
    </li>
  );
}

/** The calls, meetings, tasks and notes about a lead, deal or customer, with a quick form to add one. */
export function ActivityPanel({ lead, deal, customer }: { lead?: string; deal?: string; customer?: string }) {
  const { slug, can } = useWorkspace();
  const assignees = useAssignees(slug);
  const filter = lead ? { lead } : deal ? { deal } : { customer };
  const list = useQuery({
    queryKey: ["activities", slug, filter],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/activities/", { params: { path: { workspace: slug }, query: { ...filter, page_size: 100 } } })),
  });
  const blank = { kind: "call", subject: "", notes: "", due_at: "", assigned_to_id: "" };
  const [form, setForm] = useState(blank);
  const [open, setOpen] = useState(false);
  const add = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/activities/", {
      ...wsPath(slug),
      body: { kind: form.kind as never, subject: form.subject, notes: form.notes, due_at: fromLocalInput(form.due_at), assigned_to_id: form.assigned_to_id || null,
              lead_id: lead ?? null, deal_id: deal ?? null, customer_id: customer ?? null },
    })),
    onSuccess: () => { toast.success(form.kind === "note" ? "Note added" : "Follow-up added"); setForm(blank); setOpen(false); },
  });
  const rows = list.data?.results ?? [];
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));
  return (
    <Card>
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-sm font-semibold">Follow-ups and notes</h2>
        {can("crm.manage") && !open && <Button variant="ghost" className="px-2 py-1" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add</Button>}
      </div>
      {open && (
        <form className="space-y-3 border-b border-stone-100 p-4" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
          <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <Field label="Type"><Select value={form.kind} onChange={set("kind")}>{ACTIVITY_KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            <Field label="What" error={fieldError(add.error, "subject")}><Input required value={form.subject} onChange={set("subject")} placeholder={form.kind === "note" ? "Prefers delivery on Saturdays" : "Call to confirm the order"} /></Field>
          </div>
          {form.kind !== "note" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Due"><Input type="datetime-local" value={form.due_at} onChange={set("due_at")} /></Field>
              <Field label="Who" hint={assignees.length ? undefined : "It goes to you."}>
                <Select value={form.assigned_to_id} onChange={set("assigned_to_id")}>
                  <option value="">Me</option>
                  {assignees.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </Select>
              </Field>
            </div>
          )}
          <Field label="Notes (optional)"><Textarea rows={2} value={form.notes} onChange={set("notes")} /></Field>
          <FormError error={add.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={add.isPending}>Save</Button></div>
        </form>
      )}
      {rows.length === 0 ? <p className="px-4 py-4 text-sm text-stone-500">Nothing yet. Add the next call or meeting so it isn&apos;t forgotten.</p> : (
        <ul className="divide-y divide-stone-100">{rows.map((a) => <ActivityRow key={a.id} a={a} />)}</ul>
      )}
    </Card>
  );
}
