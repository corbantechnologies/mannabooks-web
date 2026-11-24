"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace, wsPath } from "@/lib/workspace";
import { ask } from "@/components/confirm";

type Item = { kind: "event" | "task" | "report" | "leave" | "money" | "holiday"; id: string; title: string; date: string; end: string | null; time: string | null; detail: string; who: string; link: string; editable: boolean };

const TONE: Record<Item["kind"], string> = {
  event: "bg-brand-100 text-brand-900", task: "bg-sky-100 text-sky-900", report: "bg-violet-100 text-violet-900",
  leave: "bg-amber-100 text-amber-900", money: "bg-rose-100 text-rose-900", holiday: "bg-stone-200 text-stone-800",
};
const LEGEND: [Item["kind"], string][] = [["event", "Events"], ["task", "Tasks due"], ["report", "Reports due"], ["leave", "Leave"], ["money", "Pay and tax"], ["holiday", "Holidays"]];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** The company calendar: events put on by hand, plus deadlines, leave, paydays and holidays from across MannaBooks. */
export default function CalendarPage() {
  const { slug, can, context } = useWorkspace();
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState<string | null>(null);
  const [open, setOpen] = useState<Item | null>(null);
  // the grid runs Monday to Sunday, from the week the month starts to the week it ends
  const first = new Date(month);
  first.setDate(1 - ((month.getDay() + 6) % 7));
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  last.setDate(last.getDate() + (6 - ((last.getDay() + 6) % 7)));
  const days: Date[] = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) days.push(new Date(d));
  const q = useQuery({
    queryKey: ["calendar", slug, iso(first), iso(last)],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/calendar/", { params: { path: { workspace: slug }, query: { from: iso(first), to: iso(last) } } })) as Item[],
  });
  const items = (q.data ?? []).filter((i) => show[i.kind] !== false);
  const on = (day: string) => items.filter((i) => i.date === day || (i.end && i.date <= day && day <= i.end));
  const today = iso(new Date());
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await api.DELETE("/api/v1/w/{workspace}/calendar/events/{id}/", { params: { path: { workspace: slug, id } } })),
    onSuccess: () => { toast.success("Removed"); setOpen(null); void qc.invalidateQueries({ queryKey: ["calendar", slug] }); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="w-full">
      <PageHeader title="Calendar" guide="calendar"
        description="Everything on one timeline: events, task and report deadlines, leave, paydays, tax dates and public holidays. You see what your role allows."
        actions={<Button onClick={() => setAdding(today)}><Plus className="h-4 w-4" /> Add event</Button>} />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="px-2" aria-label="Previous month" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <h2 className="w-40 text-center font-semibold">{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h2>
          <Button variant="secondary" className="px-2" aria-label="Next month" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Today</Button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {LEGEND.map(([k, label]) => (
            <label key={k} className={clsx("flex cursor-pointer items-center gap-1 rounded px-2 py-1", TONE[k], show[k] === false && "opacity-40")}>
              <input type="checkbox" className="h-3 w-3" checked={show[k] !== false} onChange={(e) => setShow((s) => ({ ...s, [k]: e.target.checked }))} />{label}
            </label>
          ))}
        </div>
      </div>
      {q.error ? <ErrorState error={q.error} /> : (
        <Card className="overflow-x-auto">
          <div className="grid min-w-[48rem] grid-cols-7 border-b border-stone-200 bg-stone-50 text-xs font-medium uppercase tracking-wide text-stone-500">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="px-2 py-1.5">{d}</div>)}
          </div>
          <div className="grid min-w-[48rem] grid-cols-7">
            {days.map((d) => {
              const key = iso(d);
              const list = on(key);
              const inMonth = d.getMonth() === month.getMonth();
              return (
                <div key={key} className={clsx("group min-h-28 border-b border-r border-stone-100 p-1", !inMonth && "bg-stone-50/70")}>
                  <div className="flex items-center justify-between">
                    <span className={clsx("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs", key === today ? "bg-brand-700 font-semibold text-white" : inMonth ? "text-stone-700" : "text-stone-400")}>{d.getDate()}</span>
                    <button type="button" aria-label={`Add an event on ${key}`} className="rounded p-0.5 text-stone-400 opacity-0 hover:bg-stone-100 group-hover:opacity-100" onClick={() => setAdding(key)}><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    {list.slice(0, 4).map((i) => (
                      <button key={`${i.kind}-${i.id}`} type="button" onClick={() => setOpen(i)} title={i.title}
                        className={clsx("block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px]", TONE[i.kind])}>
                        {i.time ? `${i.time.slice(0, 5)} ` : ""}{i.title}
                      </button>
                    ))}
                    {list.length > 4 && <button type="button" className="px-1 text-[11px] text-stone-500 hover:underline" onClick={() => setOpen({ ...list[4], title: `${list.length - 4} more on ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`, detail: list.slice(4).map((x) => x.title).join("\n"), kind: "event", link: "", editable: false })}>+{list.length - 4} more</button>}
                  </div>
                </div>
              );
            })}
          </div>
          {q.isLoading && <div className="p-3"><Spinner /></div>}
        </Card>
      )}
      <Modal open={open !== null} title={open?.title ?? ""} onClose={() => setOpen(null)}>
        {open && (
          <div className="space-y-2 text-sm">
            <p className="text-stone-600">{new Date(`${open.date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}{open.end && open.end !== open.date ? ` to ${new Date(`${open.end}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}` : ""}{open.time ? `, ${open.time.slice(0, 5)}` : ""}</p>
            {open.who && <p className="text-stone-600">{open.who}</p>}
            {open.detail && <p className="whitespace-pre-line text-stone-800">{open.detail}</p>}
            <div className="flex justify-end gap-2 pt-2">
              {open.kind === "event" && open.editable && <Button variant="ghost" className="text-red-600" loading={remove.isPending} onClick={() => void ask("Remove this event?").then((ok) => ok && remove.mutate(open.id))}>Remove</Button>}
              {open.link && <Link href={`/w/${slug}${open.link}`}><Button>Open</Button></Link>}
            </div>
          </div>
        )}
      </Modal>
      {adding && <AddEvent date={adding} everyone={can("calendar.manage")} myDepartment={context.department ?? null} onClose={() => setAdding(null)} />}
    </div>
  );
}

function AddEvent({ date, everyone, onClose }: { date: string; everyone: boolean; myDepartment: string | null; onClose: () => void }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const deps = useQuery({ queryKey: ["departments", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/departments/", wsPath(slug))) });
  const [f, setF] = useState({ title: "", details: "", starts_on: date, ends_on: "", start_time: "", department_id: "" });
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/calendar/events/", { ...wsPath(slug), body: {
      title: f.title, details: f.details, starts_on: f.starts_on, ends_on: f.ends_on || null, start_time: f.start_time || null, department_id: f.department_id || null,
    } as never })),
    onSuccess: () => { toast.success("On the calendar"); void qc.invalidateQueries({ queryKey: ["calendar", slug] }); onClose(); },
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  return (
    <Modal open title="Add an event" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Field label="What"><Input required value={f.title} onChange={set("title")} placeholder="e.g. Board meeting" /></Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="On"><Input type="date" required value={f.starts_on} onChange={set("starts_on")} /></Field>
          <Field label="Until (optional)"><Input type="date" value={f.ends_on} min={f.starts_on} onChange={set("ends_on")} /></Field>
          <Field label="At (optional)" hint="Blank: all day"><Input type="time" value={f.start_time} onChange={set("start_time")} /></Field>
        </div>
        <Field label="Who sees it" hint={everyone ? undefined : "You can add events for your own department."}>
          <Select value={f.department_id} onChange={set("department_id")} required={!everyone}>
            {everyone ? <option value="">Everyone</option> : <option value="">Choose your department</option>}
            {(deps.data?.results ?? []).map((d) => <option key={d.id} value={d.id}>{d.name} only</option>)}
          </Select>
        </Field>
        <Field label="Details (optional)"><Textarea rows={3} value={f.details} onChange={set("details")} /></Field>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Add</Button></div>
      </form>
    </Modal>
  );
}
