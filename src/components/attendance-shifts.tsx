"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { ask } from "@/components/confirm";
import { Badge, Button, Card, EmptyState, Field, FormError, Input, Modal, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { fmtDate, todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

type Shift = components["schemas"]["AttendanceShift"];
const DAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const t = (v?: string | null) => (v ? v.slice(0, 5) : "");

function monday(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
export function shiftHours(s: Shift): string {
  if (s.pattern === "flexible") return `Flexible, ${Number(s.weekly_hours)} h a week`;
  return `${t(s.start_time)} to ${t(s.end_time)}${s.overnight ? " (next day)" : ""}`;
}

/** Shifts: the rota (who is on which shift, two weeks at a time), the shifts themselves, and putting people on one. */
export function AttendanceShifts() {
  const { slug, can } = useWorkspace();
  const qc = useQueryClient();
  const [from, setFrom] = useState(monday(todayIso()));
  const [editing, setEditing] = useState<Shift | null | undefined>(undefined);
  const [placing, setPlacing] = useState(false);
  const shifts = useQuery({ queryKey: ["attendance-shifts", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/attendance/shifts/", wsPath(slug))) });
  const rota = useQuery({
    queryKey: ["attendance-rota", slug, from],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/attendance/rota/", { params: { path: { workspace: slug }, query: { from, days: 14 } } })),
  });
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["attendance-rota", slug] }); void qc.invalidateQueries({ queryKey: ["attendance-shifts", slug] }); };
  const remove = useMutation({
    mutationFn: async (id: string) => { const r = await api.DELETE("/api/v1/w/{workspace}/attendance/shift-assignments/{id}/", { params: { path: { workspace: slug, id } } }); const err = (r as { error?: { message?: string } }).error; if (err) throw new Error(err.message ?? "Couldn't remove it"); },
    onSuccess: () => { toast.success("Taken off the shift"); refresh(); }, onError: (e) => toast.error(e.message),
  });
  const endNow = useMutation({
    mutationFn: async (id: string) => unwrap(await api.PATCH("/api/v1/w/{workspace}/attendance/shift-assignments/{id}/", {
      params: { path: { workspace: slug, id } }, body: { end_date: todayIso() },
    })),
    onSuccess: () => { toast.success("Ends today"); refresh(); }, onError: (e) => toast.error(e.message),
  });
  const list = shifts.data ?? [];
  const canSet = can("attendance.manage") || list.some((s) => s.can_manage) || (rota.data?.rows ?? []).some((r) => r.can_manage);
  const days = rota.data?.days ?? [];
  const today = todayIso();
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="secondary" aria-label="Earlier" onClick={() => setFrom(addDays(from, -14))}><ChevronLeft className="h-4 w-4" /></Button>
            <h2 className="text-sm font-semibold">Rota: {fmtDate(from)} to {fmtDate(addDays(from, 13))}</h2>
            <Button variant="secondary" aria-label="Later" onClick={() => setFrom(addDays(from, 14))}><ChevronRight className="h-4 w-4" /></Button>
            {from !== monday(today) && <button type="button" className="text-sm text-brand-700 hover:underline" onClick={() => setFrom(monday(today))}>This week</button>}
          </div>
          {canSet && list.some((s) => s.is_active) && <Button onClick={() => setPlacing(true)}><Plus className="h-4 w-4" /> Put people on a shift</Button>}
        </div>
        <Card>
          {rota.isLoading ? <div className="p-4"><Spinner /></div> : (rota.data?.rows ?? []).length === 0 ? <EmptyState title="Nobody to show">People on your team, or in departments you head, show here.</EmptyState> : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="bg-stone-50 text-xs text-stone-500">
                  <th className="sticky left-0 z-10 bg-stone-50 px-3 py-2 text-left font-medium">Person</th>
                  {days.map((d) => (
                    <th key={d} className={`border-l border-stone-200 px-1 py-2 text-center font-medium ${d === today ? "bg-brand-50 text-brand-800" : ""}`}>
                      {DAY[(new Date(`${d}T12:00:00`).getDay() + 6) % 7]}<span className="block font-normal">{d.slice(8)}</span>
                    </th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-stone-100">
                  {(rota.data?.rows ?? []).map((r) => (
                    <tr key={r.employee_id}>
                      <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-2"><span className="font-medium">{r.name}</span><span className="block text-xs text-stone-500">{r.department}</span></td>
                      {r.cells.map((c) => (
                        <td key={c.day} className={`border-l border-stone-100 px-1 py-2 text-center text-xs ${c.day === today ? "bg-brand-50/50" : ""}`}>
                          {c.off ? <span className="text-stone-400" title={`${c.shift_name}: day off`}>Off</span> : c.shift_name ? <span className="inline-block max-w-20 truncate rounded bg-sky-100 px-1.5 py-0.5 text-sky-900" title={c.shift_name}>{c.shift_name}</span> : <span className="text-stone-300">-</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <p className="text-xs text-stone-500">A blank day follows the person&apos;s usual hours. While someone is on a shift, its hours, days, grace and break replace their usual ones.</p>
        {(rota.data?.assignments ?? []).length > 0 && (
          <Card>
            <Table head={["Person", "Shift", "From", "To", ""]}>
              {(rota.data?.assignments ?? []).map((a) => (
                <tr key={a.id}>
                  <Td className="font-medium">{a.employee_name}</Td>
                  <Td>{a.shift_name}{a.note ? <span className="block text-xs text-stone-500">{a.note}</span> : null}</Td>
                  <Td className="whitespace-nowrap">{fmtDate(a.start_date)}</Td>
                  <Td className="whitespace-nowrap">{fmtDate(a.end_date)}</Td>
                  <Td className="text-right">
                    {a.can_manage && (
                      <span className="flex justify-end gap-2">
                        {a.start_date <= today && a.end_date > today && <Button variant="ghost" loading={endNow.isPending} onClick={() => endNow.mutate(a.id)}>End today</Button>}
                        {a.start_date > today && <button type="button" aria-label="Remove" className="text-stone-400 hover:text-red-600"
                          onClick={() => void ask(`Take ${a.employee_name} off ${a.shift_name}?`, { confirmLabel: "Take off", danger: true }).then((ok) => ok && remove.mutate(a.id))}><Trash2 className="h-4 w-4" /></button>}
                      </span>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Shifts</h2>
          {canSet && <Button variant="secondary" onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> New shift</Button>}
        </div>
        <Card>
          {shifts.isLoading ? <div className="p-4"><Spinner /></div> : list.length === 0 ? <EmptyState title="No shifts yet">Set up a shift (for example Night, 22:00 to 06:00), then put people on it for some dates.</EmptyState> : (
            <Table head={["Shift", "Hours", "Days", "For", "On it today", ""]}>
              {list.map((s) => (
                <tr key={s.id} className={s.is_active ? "" : "opacity-60"}>
                  <Td className="font-medium">{s.name}{!s.is_active && <span className="ml-2"><Badge tone="stone">Off</Badge></span>}</Td>
                  <Td>{shiftHours(s)}</Td>
                  <Td>{s.days?.length ? s.days.map((d) => DAY[d]).join(", ") : "Their usual days"}</Td>
                  <Td>{s.department_name || "Anyone"}</Td>
                  <Td className="text-right font-mono">{s.people_now}</Td>
                  <Td className="text-right">{s.can_manage && <Button variant="ghost" onClick={() => setEditing(s)}>Change</Button>}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </section>
      {editing !== undefined && <ShiftForm shift={editing} onClose={() => setEditing(undefined)} onSaved={refresh} />}
      {placing && <PlaceForm shifts={list.filter((s) => s.is_active)} people={(rota.data?.rows ?? []).filter((r) => r.can_manage)} onClose={() => setPlacing(false)} onSaved={refresh} />}
    </div>
  );
}

function ShiftForm({ shift, onClose, onSaved }: { shift: Shift | null; onClose: () => void; onSaved: () => void }) {
  const { slug, can, context } = useWorkspace();
  const headed = (context.headed_departments ?? []) as { id: string; name: string }[];
  const depts = useQuery({ queryKey: ["departments", slug], enabled: can("attendance.manage"), queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/departments/", wsPath(slug))) });
  const options = can("attendance.manage") ? (depts.data?.results ?? []).map((d) => ({ id: d.id, name: d.name })) : headed;
  const [f, setF] = useState({
    name: shift?.name ?? "", department_id: shift?.department_id ?? (can("attendance.manage") ? "" : headed[0]?.id ?? ""), pattern: shift?.pattern ?? "fixed",
    start_time: t(shift?.start_time), end_time: t(shift?.end_time), weekly_hours: shift?.weekly_hours ? String(Number(shift.weekly_hours)) : "",
    days: (shift?.days ?? []) as number[], grace_minutes: shift?.grace_minutes != null ? String(shift.grace_minutes) : "",
    break_minutes: shift?.break_minutes != null ? String(shift.break_minutes) : "", is_active: shift?.is_active ?? true,
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name: f.name, department_id: f.department_id || null, pattern: f.pattern as "fixed", start_time: f.start_time || null, end_time: f.end_time || null,
        weekly_hours: f.weekly_hours || null, days: f.days.length ? f.days : null, grace_minutes: f.grace_minutes === "" ? null : Number(f.grace_minutes),
        break_minutes: f.break_minutes === "" ? null : Number(f.break_minutes), is_active: f.is_active,
      };
      return shift
        ? unwrap(await api.PATCH("/api/v1/w/{workspace}/attendance/shifts/{id}/", { params: { path: { workspace: slug, id: shift.id } }, body }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/attendance/shifts/", { ...wsPath(slug), body }));
    },
    onSuccess: () => { toast.success("Shift saved"); onSaved(); onClose(); },
  });
  const overnight = f.pattern === "fixed" && f.start_time && f.end_time && f.end_time <= f.start_time;
  return (
    <Modal open title={shift ? `Change ${shift.name}` : "New shift"} onClose={onClose} size="lg">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Name"><Input required value={f.name} onChange={set("name")} placeholder="e.g. Night" /></Field>
          <Field label="For">
            <Select value={f.department_id} onChange={set("department_id")}>
              {can("attendance.manage") && <option value="">Anyone in the business</option>}
              {options.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Hours"><Select value={f.pattern} onChange={set("pattern")}><option value="fixed">Fixed times</option><option value="flexible">Flexible: hours a week</option></Select></Field>
          {f.pattern === "fixed" ? (
            <>
              <Field label="Starts"><Input type="time" required value={f.start_time} onChange={set("start_time")} /></Field>
              <Field label="Ends" hint={overnight ? "Before the start: ends the next morning" : undefined}><Input type="time" required value={f.end_time} onChange={set("end_time")} /></Field>
            </>
          ) : <Field label="Hours a week"><Input type="number" min="1" step="0.5" required value={f.weekly_hours} onChange={set("weekly_hours")} /></Field>}
          <Field label="Grace (minutes)" hint="Blank: as usual"><Input type="number" min="0" value={f.grace_minutes} onChange={set("grace_minutes")} /></Field>
          <Field label="Break (minutes)" hint="Blank: as usual"><Input type="number" min="0" value={f.break_minutes} onChange={set("break_minutes")} /></Field>
        </div>
        <Field label="Days" hint="None ticked: the person's usual working days">
          <div className="flex flex-wrap gap-2">
            {DAY.map((d, i) => {
              const on = f.days.includes(i);
              return (
                <label key={d} className={`flex cursor-pointer items-center rounded-full border px-3 py-1 text-sm ${on ? "border-brand-600 bg-brand-50 text-brand-800" : "border-stone-200"}`}>
                  <input type="checkbox" className="sr-only" checked={on} onChange={(e) => setF({ ...f, days: e.target.checked ? [...f.days, i].sort() : f.days.filter((x) => x !== i) })} />{d}
                </label>
              );
            })}
          </div>
        </Field>
        {shift && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> In use (untick to switch it off)</label>}
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
      </form>
    </Modal>
  );
}

function PlaceForm({ shifts, people, onClose, onSaved }: {
  shifts: Shift[]; people: { employee_id: string; name: string; department: string }[]; onClose: () => void; onSaved: () => void;
}) {
  const { slug } = useWorkspace();
  const [f, setF] = useState({ shift_id: shifts[0]?.id ?? "", start_date: todayIso(), end_date: addDays(todayIso(), 13), note: "" });
  const [who, setWho] = useState<string[]>([]);
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/attendance/shift-assignments/", { ...wsPath(slug), body: { ...f, employee_ids: who } })),
    onSuccess: (made) => { toast.success(`${made.length} put on the shift`); onSaved(); onClose(); },
  });
  return (
    <Modal open title="Put people on a shift" onClose={onClose} size="lg">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Shift"><Select required value={f.shift_id} onChange={(e) => setF({ ...f, shift_id: e.target.value })}>{shifts.map((s) => <option key={s.id} value={s.id}>{s.name} ({shiftHours(s)})</option>)}</Select></Field>
          <Field label="From"><Input type="date" required value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field>
          <Field label="To"><Input type="date" required min={f.start_date} value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></Field>
        </div>
        <Field label={`People (${who.length} chosen)`}>
          <div className="max-h-64 overflow-y-auto rounded-md border border-stone-200 p-2">
            {people.map((p) => (
              <label key={p.employee_id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-stone-50">
                <input type="checkbox" checked={who.includes(p.employee_id)} onChange={(e) => setWho(e.target.checked ? [...who, p.employee_id] : who.filter((x) => x !== p.employee_id))} />
                {p.name}<span className="text-xs text-stone-500">{p.department}</span>
              </label>
            ))}
          </div>
        </Field>
        <Field label="Note (optional)"><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="e.g. Year-end stock take" /></Field>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={!who.length} loading={save.isPending}>Put them on it</Button></div>
      </form>
    </Modal>
  );
}
