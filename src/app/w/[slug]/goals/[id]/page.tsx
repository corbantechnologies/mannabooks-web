"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { ask } from "@/components/confirm";
import { GoalCard } from "@/components/goal-card";
import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, Spinner, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { BAR, type GoalDetail, STATUS_TONE, figures } from "@/lib/goals";
import { useWorkspace } from "@/lib/workspace";

/** One goal: how far along it is against the time gone, its milestones, check-ins and the goals that feed it. */
export default function GoalPage() {
  const { id } = useParams<{ id: string }>();
  const { slug, context } = useWorkspace();
  const router = useRouter();
  const qc = useQueryClient();
  const key = ["goal", slug, id];
  const path = { params: { path: { workspace: slug, id } } };
  const q = useQuery({ queryKey: key, queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/goals/{id}/", path)) });
  const saved = (g: GoalDetail) => { qc.setQueryData(key, g); void qc.invalidateQueries({ queryKey: ["goals", slug] }); };
  const [step, setStep] = useState("");
  const [note, setNote] = useState("");
  const [value, setValue] = useState("");
  const [dropping, setDropping] = useState(false);
  const [reason, setReason] = useState("");
  const addStep = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/goals/{id}/milestones/", { ...path, body: { text: step } })),
    onSuccess: (g) => { saved(g); setStep(""); },
  });
  const tick = useMutation({
    mutationFn: async (v: { id: string; done: boolean }) => unwrap(await api.PATCH("/api/v1/w/{workspace}/goals/milestones/{id}/", { params: { path: { workspace: slug, id: v.id } }, body: { done: v.done } })),
    onSuccess: saved, onError: (e) => toast.error(e.message),
  });
  const dropStep = useMutation({
    mutationFn: async (mid: string) => unwrap(await api.DELETE("/api/v1/w/{workspace}/goals/milestones/{id}/", { params: { path: { workspace: slug, id: mid } } })),
    onSuccess: saved,
  });
  const checkIn = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/goals/{id}/check-ins/", { ...path, body: { note, value: value || null } })),
    onSuccess: (g) => { saved(g); setNote(""); setValue(""); toast.success("Checked in"); },
  });
  const close = useMutation({
    mutationFn: async (outcome: "dropped" | "") => unwrap(await api.POST("/api/v1/w/{workspace}/goals/{id}/close/", { ...path, body: { outcome, reason } })),
    onSuccess: (g) => { saved(g); setDropping(false); setReason(""); },
  });
  const remove = useMutation({
    mutationFn: async () => { await api.DELETE("/api/v1/w/{workspace}/goals/{id}/", path); },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["goals", slug] }); router.push(`/w/${slug}/goals`); },
  });
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} />;
  const g = q.data;
  const me = context.membership_id as string | undefined;
  const onIt = g.can_manage || (me && g.owner_id === me);
  const whose = g.level === "company" ? "The company" : g.level === "department" ? g.department_name : g.owner_name;
  const pct = Math.min(Number(g.percent), 100);
  return (
    <div className="w-full max-w-5xl space-y-5">
      <Link href={`/w/${slug}/goals`} className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"><ArrowLeft className="h-4 w-4" /> Goals</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="break-words text-xl font-semibold text-stone-900">{g.title}</h1>
          <p className="mt-1 text-sm text-stone-600">
            {whose} · {g.period_label} ({fmtDate(g.start_date)} to {fmtDate(g.end_date)}) · {g.measure_label}
            {g.project_name ? ` · project ${g.project_name}` : ""}{g.cost_center_name ? ` · ${g.cost_center_name}` : ""}
          </p>
          {g.parent_id && <p className="mt-1 text-sm">Helps reach <Link className="text-brand-700 hover:underline" href={`/w/${slug}/goals/${g.parent_id}`}>{g.parent_title}</Link></p>}
        </div>
        {g.can_manage && (
          <div className="flex flex-wrap gap-2">
            <Link href={`/w/${slug}/goals/${g.id}/edit`}><Button variant="secondary"><Pencil className="h-4 w-4" /> Change</Button></Link>
            {g.outcome === "dropped"
              ? <Button variant="secondary" loading={close.isPending} onClick={() => close.mutate("")}>Open again</Button>
              : <Button variant="secondary" onClick={() => setDropping(true)}>Drop</Button>}
            <Button variant="ghost" className="text-red-600" loading={remove.isPending}
              onClick={() => void ask(`Delete the goal ${g.title}? Its milestones and check-ins go too.`, { confirmLabel: "Delete goal", danger: true }).then((ok) => ok && remove.mutate())}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="break-words text-xl font-semibold tabular-nums sm:text-2xl">{figures(g, fmt)}</p>
          <Badge tone={STATUS_TONE[g.status]}>{g.status_label}</Badge>
        </div>
        <div className="relative mt-3 h-3 rounded-full bg-stone-100">
          <div className={`h-3 rounded-full ${BAR[g.status]}`} style={{ width: `${pct}%` }} />
          <div className="absolute -top-1 h-5 w-0.5 bg-stone-600" style={{ left: `${Math.min(Number(g.time_percent), 100)}%` }} aria-hidden />
        </div>
        <p className="mt-2 text-sm text-stone-600">
          {Number(g.percent).toFixed(0)}% of the target, with {Number(g.time_percent).toFixed(0)}% of the period gone.
          {g.outcome === "dropped" && g.outcome_reason ? ` Dropped: ${g.outcome_reason}.` : ""}
          {g.value == null ? " Figures are shown to people who can see reports." : ""}
        </p>
        {g.description && <p className="mt-3 whitespace-pre-wrap text-sm text-stone-700">{g.description}</p>}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {(g.measure === "milestones" || g.milestones.length > 0) && (
          <Card className="p-4 sm:p-5">
            <h2 className="text-sm font-semibold">Milestones</h2>
            <ul className="mt-2 divide-y divide-stone-100">
              {g.milestones.map((m) => (
                <li key={m.id} className="flex items-start gap-2 py-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={m.done} disabled={!onIt} onChange={(e) => tick.mutate({ id: m.id, done: e.target.checked })} />
                  <span className={`min-w-0 flex-1 break-words ${m.done ? "text-stone-400 line-through" : ""}`}>
                    {m.text}{m.done && m.done_by_name ? <span className="block text-xs no-underline text-stone-400">{m.done_by_name}</span> : null}
                  </span>
                  {g.can_manage && <button type="button" aria-label="Remove" className="text-stone-400 hover:text-red-600" onClick={() => dropStep.mutate(m.id)}><Trash2 className="h-4 w-4" /></button>}
                </li>
              ))}
            </ul>
            {g.can_manage && (
              <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (step.trim()) addStep.mutate(); }}>
                <Input value={step} onChange={(e) => setStep(e.target.value)} placeholder="Add a milestone" />
                <Button type="submit" variant="secondary" loading={addStep.isPending}><Plus className="h-4 w-4" /></Button>
              </form>
            )}
          </Card>
        )}

        <Card className="p-4 sm:p-5">
          <h2 className="text-sm font-semibold">Check-ins</h2>
          {onIt && g.outcome !== "dropped" && (
            <form className="mt-2 space-y-2" onSubmit={(e) => { e.preventDefault(); checkIn.mutate(); }}>
              {g.measure === "manual" && (
                <Field label={`New figure${g.unit ? ` (${g.unit})` : ""}`}><Input type="number" inputMode="decimal" step="any" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
              )}
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="How it is going, what is in the way" />
              <FormError error={checkIn.error} />
              <Button type="submit" variant="secondary" loading={checkIn.isPending} disabled={!note.trim() && !value}>Check in</Button>
            </form>
          )}
          {g.check_ins.length === 0 ? <p className="mt-2 text-sm text-stone-500">No check-ins yet.</p> : (
            <ul className="mt-3 space-y-3">
              {g.check_ins.map((c) => (
                <li key={c.id} className="text-sm">
                  <p className="text-xs text-stone-500">{c.by_name} · {fmtDate(c.created_at)}{c.value != null ? ` · ${Number(c.value).toLocaleString("en-KE")}${g.unit ? ` ${g.unit}` : ""}` : ""}</p>
                  {c.note && <p className="whitespace-pre-wrap text-stone-800">{c.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Goals that feed this one ({g.child_goals.length})</h2>
          <Link href={`/w/${slug}/goals/new?parent=${g.id}`} className="text-sm text-brand-700 hover:underline">Add one under it</Link>
        </div>
        {g.child_goals.length === 0 ? <p className="text-sm text-stone-500">None yet. A department or a person can set a goal that helps reach this one.</p> : (
          <div className="grid gap-3 lg:grid-cols-2">{g.child_goals.map((c) => <GoalCard key={c.id} g={c} compact />)}</div>
        )}
      </section>

      <Modal open={dropping} title={`Drop ${g.title}?`} onClose={() => setDropping(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); close.mutate("dropped"); }}>
          <p className="text-sm text-stone-600">A dropped goal stops being tracked and shows as Dropped. You can open it again later.</p>
          <Field label="Why"><Input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. The plan changed" /></Field>
          <FormError error={close.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setDropping(false)}>Cancel</Button><Button type="submit" loading={close.isPending}>Drop the goal</Button></div>
        </form>
      </Modal>
    </div>
  );
}
