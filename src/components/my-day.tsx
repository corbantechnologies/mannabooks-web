"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { ArrowDown, ArrowUp, Check, ListChecks, Settings2, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, FormError, Input, Modal, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

type Today = components["schemas"]["ChecklistToday"];

export function useMyDay(slug: string) {
  return useQuery({
    queryKey: ["my-day", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/dashboard/checklist/", { params: { path: { workspace: slug } } })),
  });
}

/**
 * Overview, "My day": the business's daily checklist plus your own lines. Lines that count what is waiting tick
 * themselves when nothing is; the rest you tick. "Take your tasks for the day" is done by picking today's tasks.
 */
export function MyDayCard() {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const q = useMyDay(slug);
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState(false);
  const set = (d: Today) => qc.setQueryData(["my-day", slug], d);
  const tick = useMutation({
    mutationFn: async (v: { item_id: string; done: boolean }) => unwrap(await api.POST("/api/v1/w/{workspace}/dashboard/checklist/tick/", { params: { path: { workspace: slug } }, body: v })),
    onSuccess: set, onError: (e) => toast.error(e.message),
  });
  if (q.isLoading) return <Card className="p-5"><Spinner /></Card>;
  if (!q.data) return null;
  const d = q.data;
  const pct = d.total ? Math.round((100 * d.done) / d.total) : 0;
  const day = new Date(`${d.day}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900"><ListChecks className="h-4 w-4 text-brand-700" /> My day</h2>
          <p className="mt-0.5 text-sm text-stone-600">{day} · {d.done} of {d.total} done{d.total > 0 && d.done === d.total ? ". All set for the day." : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setEditing(true)}>Edit my list</Button>
          {d.can_manage && <Link href={`/w/${slug}/settings/checklist`}><Button variant="ghost"><Settings2 className="h-4 w-4" /> Business checklist</Button></Link>}
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-stone-100"><div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
      {d.items.length === 0 ? <p className="mt-3 text-sm text-stone-500">Nothing on your checklist. Add lines of your own with Edit my list.</p> : (
        <ul className="mt-3 grid gap-x-6 lg:grid-cols-2">
          {d.items.map((i) => {
            const auto = i.how === "nothing" || i.how === "picked";
            return (
              <li key={i.id} className="flex items-start gap-3 border-b border-stone-100 py-2.5 last:border-0">
                <button type="button" aria-label={i.done ? `Untick ${i.title}` : `Tick ${i.title}`} disabled={auto || tick.isPending}
                  onClick={() => (i.key === "plan_day" && !i.done ? setPicking(true) : tick.mutate({ item_id: i.id, done: !i.done }))}
                  className={clsx("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                    i.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-stone-300 bg-white hover:border-brand-500", auto && "cursor-default")}>
                  {i.done && <Check className="h-3.5 w-3.5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {i.link ? (
                      <Link href={`/w/${slug}${i.link}`} className={clsx("text-sm font-medium hover:underline", i.done ? "text-stone-500" : "text-stone-900")}
                        onClick={() => { if (!i.done && i.count == null && i.key !== "plan_day") tick.mutate({ item_id: i.id, done: true }); }}>{i.title}</Link>
                    ) : <span className={clsx("text-sm font-medium", i.done ? "text-stone-500" : "text-stone-900")}>{i.title}</span>}
                    {i.count != null && i.count > 0 && <Badge tone="amber">{i.count} waiting</Badge>}
                    {i.personal && <span className="text-xs text-stone-400">yours</span>}
                  </div>
                  {i.how === "nothing" && <p className="text-xs text-stone-500">Nothing waiting</p>}
                  {i.key === "plan_day" && (
                    <div className="mt-1 space-y-1">
                      {d.picks.map((t) => (
                        <Link key={t.id} href={`/w/${slug}/tasks/${t.id}`} className="flex flex-wrap items-center gap-2 text-sm hover:underline">
                          <span className={clsx(t.status === "done" || t.status === "to_check" ? "text-stone-400 line-through" : "text-stone-700")}>{t.title}</span>
                          {t.priority === "high" && <Badge tone="red">High</Badge>}
                          {t.due_date && <span className="text-xs text-stone-500">due {fmtDate(t.due_date)}</span>}
                        </Link>
                      ))}
                      <button type="button" className="text-sm font-medium text-brand-700 hover:underline" onClick={() => setPicking(true)}>
                        {d.picks.length ? "Change today's tasks" : "Pick from your tasks"}
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {picking && <PickTasks slug={slug} picked={d.picks.map((p) => p.id)} onClose={() => setPicking(false)} onSaved={set}
        onNone={() => { const line = d.items.find((i) => i.key === "plan_day"); if (line) tick.mutate({ item_id: line.id, done: true }); setPicking(false); }} />}
      {editing && <EditMyList slug={slug} onClose={() => { setEditing(false); void qc.invalidateQueries({ queryKey: ["my-day", slug] }); }} />}
    </Card>
  );
}

/** "Take your tasks for the day": tick your open tasks and put them in order. */
function PickTasks({ slug, picked, onClose, onSaved, onNone }: { slug: string; picked: string[]; onClose: () => void; onSaved: (d: Today) => void; onNone: () => void }) {
  const [order, setOrder] = useState<string[]>(picked);
  const tasks = useQuery({
    queryKey: ["tasks", slug, "mine", true, "pick"],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/tasks/", { params: { path: { workspace: slug }, query: { box: "mine", open: true, page_size: 200 } as never } })),
  });
  const rows = (tasks.data?.results ?? []).filter((t) => t.status === "todo" || t.status === "in_progress" || order.includes(t.id));
  const byId = new Map(rows.map((t) => [t.id, t]));
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PUT("/api/v1/w/{workspace}/dashboard/checklist/plan/", { params: { path: { workspace: slug } }, body: { task_ids: order } })),
    onSuccess: (d) => { onSaved(d); toast.success(order.length ? `${order.length} task${order.length === 1 ? "" : "s"} for today` : "Today's tasks cleared"); onClose(); },
  });
  const toggle = (id: string) => setOrder((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  const move = (id: string, by: number) => setOrder((o) => {
    const i = o.indexOf(id), j = i + by;
    if (j < 0 || j >= o.length) return o;
    const n = [...o]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  return (
    <Modal open title="Take your tasks for the day" onClose={onClose}>
      {tasks.isLoading ? <Spinner /> : rows.length === 0 ? (
        <div className="space-y-3">
          <EmptyState title="You have no open tasks">Tasks given to you, or that you take from your department, show here.</EmptyState>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={onNone}>Nothing to take today</Button></div>
        </div>
      ) : (
        <div className="space-y-4">
          {order.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500">Today, in order</p>
              <ol className="space-y-1">
                {order.map((id, i) => (
                  <li key={id} className="flex items-center gap-2 rounded-md bg-brand-50 px-2 py-1.5 text-sm">
                    <span className="w-5 text-stone-500">{i + 1}.</span>
                    <span className="min-w-0 flex-1 truncate">{byId.get(id)?.title ?? "A task"}</span>
                    <button type="button" aria-label="Up" onClick={() => move(id, -1)} className="text-stone-500 hover:text-stone-900"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" aria-label="Down" onClick={() => move(id, 1)} className="text-stone-500 hover:text-stone-900"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" aria-label="Take off" onClick={() => toggle(id)} className="text-stone-500 hover:text-red-600"><X className="h-4 w-4" /></button>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500">Your open tasks</p>
            <ul className="max-h-72 divide-y divide-stone-100 overflow-y-auto">
              {rows.map((t) => (
                <li key={t.id}>
                  <label className="flex cursor-pointer items-start gap-2 py-2 text-sm">
                    <input type="checkbox" className="mt-0.5" checked={order.includes(t.id)} onChange={() => toggle(t.id)} />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{t.title}</span>
                      <span className="block text-xs text-stone-500">
                        {t.status === "in_progress" ? "In progress" : "To do"}{t.due_date ? ` · due ${fmtDate(t.due_date)}` : ""}{t.priority === "high" ? " · high priority" : ""}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <FormError error={save.error} />
          <div className="flex flex-wrap justify-end gap-2">
            {order.length === 0 && picked.length === 0 && <Button variant="ghost" onClick={onNone}>Nothing to take today</Button>}
            <Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Save today&apos;s tasks</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Your own lines (add, remove) and the business's lines you can take off your own list. */
function EditMyList({ slug, onClose }: { slug: string; onClose: () => void }) {
  const qc = useQueryClient();
  const key = ["checklist-items", slug, "mine"];
  const items = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/dashboard/checklist/items/", { params: { path: { workspace: slug }, query: { scope: "mine" } } })),
  });
  const [title, setTitle] = useState("");
  const refresh = () => { void qc.invalidateQueries({ queryKey: key }); void qc.invalidateQueries({ queryKey: ["my-day", slug] }); };
  const add = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/dashboard/checklist/items/", { params: { path: { workspace: slug } }, body: { title, personal: true } })),
    onSuccess: () => { setTitle(""); refresh(); },
  });
  const hide = useMutation({
    mutationFn: async (v: { id: string; hidden: boolean }) => unwrap(await api.POST("/api/v1/w/{workspace}/dashboard/checklist/items/{id}/hide/", { params: { path: { workspace: slug, id: v.id } }, body: { hidden: v.hidden } })),
    onSuccess: refresh, onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { await api.DELETE("/api/v1/w/{workspace}/dashboard/checklist/items/{id}/", { params: { path: { workspace: slug, id } } }); },
    onSuccess: refresh,
  });
  const rows = items.data ?? [];
  const business = rows.filter((i) => !i.personal);
  const own = rows.filter((i) => i.personal);
  return (
    <Modal open title="Edit my list" onClose={onClose}>
      {items.isLoading ? <Spinner /> : (
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500">From the business</p>
            {business.length === 0 ? <p className="text-sm text-stone-500">None.</p> : (
              <ul className="divide-y divide-stone-100">
                {business.map((i) => (
                  <li key={i.id} className="flex items-center gap-2 py-2 text-sm">
                    <input type="checkbox" checked={!i.hidden} onChange={(e) => hide.mutate({ id: i.id!, hidden: !e.target.checked })} aria-label={`Show ${i.title}`} />
                    <span className={clsx("flex-1", i.hidden && "text-stone-400 line-through")}>{i.title}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-xs text-stone-500">Untick a line to take it off your own list. It stays for everyone else.</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500">Your own lines</p>
            <ul className="divide-y divide-stone-100">
              {own.map((i) => (
                <li key={i.id} className="flex items-center gap-2 py-2 text-sm">
                  <span className="flex-1">{i.title}</span>
                  <button type="button" aria-label={`Remove ${i.title}`} className="text-stone-400 hover:text-red-600" onClick={() => remove.mutate(i.id!)}><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
            <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (title.trim()) add.mutate(); }}>
              <Input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Call two customers" />
              <Button type="submit" variant="secondary" loading={add.isPending}>Add</Button>
            </form>
            <FormError error={add.error} />
          </div>
          <div className="flex justify-end"><Button onClick={onClose}>Done</Button></div>
        </div>
      )}
    </Modal>
  );
}
