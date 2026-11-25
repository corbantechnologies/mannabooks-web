"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, Wifi } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { WORKER_TYPES } from "@/lib/attendance";
import { useWorkspace, wsPath } from "@/lib/workspace";

const t = (v?: string | null) => (v ? v.slice(0, 5) : "");

/** Settings > Attendance: every rule is HR's to set, so the business never has to ask MannaBooks. */
export default function AttendanceSettingsPage() {
  const { slug, can } = useWorkspace();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["attendance-settings", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/attendance/settings/", wsPath(slug))) });
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const save = useMutation({
    mutationFn: async (body: Record<string, unknown>) => unwrap(await api.PATCH("/api/v1/w/{workspace}/attendance/settings/", { ...wsPath(slug), body: body as never })),
    onSuccess: (d) => { qc.setQueryData(["attendance-settings", slug], d); void qc.invalidateQueries({ queryKey: ["attendance-me", slug] }); setDraft({}); toast.success("Saved"); },
  });
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} />;
  const s = { ...q.data, ...draft } as typeof q.data;
  const set = (k: string, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));
  const manage = can("attendance.manage");
  const types = (s.tracked_types as string[]) ?? [];
  return (
    <div className="w-full max-w-5xl space-y-5">
      <Link href={`/w/${slug}/attendance`} className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"><ArrowLeft className="h-4 w-4" /> Attendance</Link>
      <PageHeader title="Attendance settings" guide="attendance"
        description="The business's rules. A department or one person can have their own hours, grace and break below. Every change goes in the audit log." />

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <div>
          <p className="font-medium">{q.data.enabled ? "Attendance is on" : "Attendance is off"}</p>
          <p className="text-sm text-stone-600">{q.data.enabled ? "Staff whose time is tracked can clock in from their phone or computer." : "Set the rules, then switch it on. Attendance is part of the People add-on."}</p>
        </div>
        {manage && <Button variant={q.data.enabled ? "secondary" : "primary"} loading={save.isPending} onClick={() => save.mutate({ enabled: !q.data.enabled })}>{q.data.enabled ? "Switch off" : "Switch on"}</Button>}
      </Card>

      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); save.mutate(draft); }}>
        <fieldset disabled={!manage} className="space-y-5">
          <Card className="space-y-3 p-4 sm:p-5">
            <h2 className="text-sm font-semibold">Working hours</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Pattern" hint="Fixed: set start and end. Flexible: a number of hours a week, any time.">
                <Select value={s.pattern} onChange={(e) => set("pattern", e.target.value)}><option value="fixed">Fixed hours</option><option value="flexible">Flexible hours</option></Select>
              </Field>
              <Field label="Start"><Input type="time" value={t(s.start_time)} onChange={(e) => set("start_time", e.target.value)} /></Field>
              <Field label="End"><Input type="time" value={t(s.end_time)} onChange={(e) => set("end_time", e.target.value)} /></Field>
              <Field label="Hours a week" hint="Flexible hours, and the base for extra hours later"><Input type="number" min="1" step="0.5" value={String(s.weekly_hours)} onChange={(e) => set("weekly_hours", e.target.value)} /></Field>
              <Field label="Core hours from" hint="Flexible: everyone in (optional)"><Input type="time" value={t(s.core_start)} onChange={(e) => set("core_start", e.target.value || null)} /></Field>
              <Field label="Core hours to"><Input type="time" value={t(s.core_end)} onChange={(e) => set("core_end", e.target.value || null)} /></Field>
              <Field label="Grace before late (minutes)"><Input type="number" min="0" value={String(s.grace_minutes)} onChange={(e) => set("grace_minutes", Number(e.target.value))} /></Field>
            </div>
            <p className="text-xs text-stone-500">Working days follow the business&apos;s working week (Settings), or each person&apos;s own week on their employee record. Public holidays and approved leave are days off.</p>
          </Card>

          <Card className="space-y-3 p-4 sm:p-5">
            <h2 className="text-sm font-semibold">Breaks and forgotten clock-outs</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Fixed unpaid break (minutes)" hint="Taken off a full day when the buttons aren't used"><Input type="number" min="0" value={String(s.break_minutes)} onChange={(e) => set("break_minutes", Number(e.target.value))} /></Field>
              <Field label="Break buttons"><Select value={s.break_buttons ? "yes" : "no"} onChange={(e) => set("break_buttons", e.target.value === "yes")}><option value="yes">Show Start and End break</option><option value="no">No buttons: fixed break only</option></Select></Field>
              <Field label="Close a forgotten clock-out after (hours)" hint="Past the end time; marked No clock-out"><Input type="number" min="1" max="12" value={String(s.auto_close_hours)} onChange={(e) => set("auto_close_hours", Number(e.target.value))} /></Field>
            </div>
          </Card>

          <Card className="space-y-3 p-4 sm:p-5">
            <h2 className="text-sm font-semibold">Who is tracked</h2>
            <div className="flex flex-wrap gap-2">
              {WORKER_TYPES.map(([k, label]) => {
                const on = types.includes(k);
                return (
                  <label key={k} className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${on ? "border-brand-600 bg-brand-50 text-brand-800" : "border-stone-200 text-stone-700"}`}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={(e) => set("tracked_types", e.target.checked ? [...types, k] : types.filter((x) => x !== k))} />{label}
                  </label>
                );
              })}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Daily-waged: a full day is at least (hours)"><Input type="number" min="0" step="0.5" value={String(s.full_day_hours)} onChange={(e) => set("full_day_hours", e.target.value)} /></Field>
              <Field label="A half day is at least (hours)"><Input type="number" min="0" step="0.5" value={String(s.half_day_hours)} onChange={(e) => set("half_day_hours", e.target.value)} /></Field>
            </div>
          </Card>

          <Card className="space-y-3 p-4 sm:p-5">
            <h2 className="text-sm font-semibold">Clocking in away from the office</h2>
            <Field label="When someone clocks in from outside the office networks below">
              <Select className="max-w-md" value={s.elsewhere} onChange={(e) => set("elsewhere", e.target.value)}><option value="flag">Allow it, marked Away from the office</option><option value="refuse">Refuse it</option></Select>
            </Field>
          </Card>
        </fieldset>
        <FormError error={save.error} />
        {manage && (
          <div className="sticky bottom-0 z-10 flex justify-end gap-2 rounded-lg border border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">
            <Button type="button" variant="secondary" disabled={!Object.keys(draft).length} onClick={() => setDraft({})}>Undo changes</Button>
            <Button type="submit" disabled={!Object.keys(draft).length} loading={save.isPending}>Save settings</Button>
          </div>
        )}
      </form>

      <Offices manage={manage} />
      <Overrides manage={manage} />
    </div>
  );
}

function Offices({ manage }: { manage: boolean }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const q = useQuery({ queryKey: ["attendance-offices", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/attendance/offices/", wsPath(slug))) });
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["attendance-offices", slug] }); void qc.invalidateQueries({ queryKey: ["attendance-me", slug] }); };
  const add = useMutation({
    mutationFn: async (here: boolean) => unwrap(await api.POST("/api/v1/w/{workspace}/attendance/offices/", { ...wsPath(slug), body: { address: here ? "" : address, label: label || (here ? "Office Wi-Fi" : "") } as never })),
    onSuccess: (o) => { toast.success(`${o.address} added`); setAddress(""); setLabel(""); refresh(); },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { await api.DELETE("/api/v1/w/{workspace}/attendance/offices/{id}/", { params: { path: { workspace: slug, id } } }); },
    onSuccess: refresh,
  });
  return (
    <Card className="space-y-3 p-4 sm:p-5">
      <h2 className="text-sm font-semibold">Office networks</h2>
      <p className="text-sm text-stone-600">
        Clocking in from one of these internet addresses counts as at the office. The easy way: open this page on the office Wi-Fi and click <b>Add this network</b>.
        Phones on mobile data have changing addresses, so staff need to be on the office Wi-Fi. If your provider changes the office&apos;s address, add the new one.
      </p>
      {(q.data ?? []).length === 0 ? <p className="text-sm text-stone-500">None yet: clock-ins aren&apos;t checked for place.</p> : (
        <Table head={["Name", "Address", ""]}>
          {(q.data ?? []).map((o) => (
            <tr key={o.id}><Td>{o.label || "-"}</Td><Td className="font-mono">{o.address}</Td>
              <Td className="text-right">{manage && <button type="button" aria-label="Remove" className="text-stone-400 hover:text-red-600" onClick={() => remove.mutate(o.id)}><Trash2 className="h-4 w-4" /></button>}</Td></tr>
          ))}
        </Table>
      )}
      {manage && (
        <div className="flex flex-wrap items-end gap-2">
          <Button variant="secondary" loading={add.isPending && add.variables} onClick={() => add.mutate(true)}><Wifi className="h-4 w-4" /> Add this network</Button>
          <span className="text-sm text-stone-500">or</span>
          <Input className="w-40" placeholder="Name" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input className="w-48 font-mono" placeholder="41.90.1.2 or 41.90.1.0/24" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Button variant="secondary" disabled={!address.trim()} loading={add.isPending && !add.variables} onClick={() => add.mutate(false)}>Add</Button>
        </div>
      )}
    </Card>
  );
}

function Overrides({ manage }: { manage: boolean }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const q = useQuery({ queryKey: ["attendance-overrides", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/attendance/overrides/", wsPath(slug))) });
  const remove = useMutation({
    mutationFn: async (id: string) => { await api.DELETE("/api/v1/w/{workspace}/attendance/overrides/{id}/", { params: { path: { workspace: slug, id } } }); },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["attendance-overrides", slug] }),
  });
  const rows = q.data ?? [];
  return (
    <Card className="space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Departments and people with their own hours</h2>
        {manage && <Button variant="secondary" onClick={() => setEditing(true)}>Add</Button>}
      </div>
      {rows.length === 0 ? <EmptyState title="Everyone follows the settings above" /> : (
        <Table head={["For", "Pattern", "Hours", "Grace", "Break", "Tracked", ""]}>
          {rows.map((o) => (
            <tr key={o.id}>
              <Td className="font-medium">{o.department_name || o.employee_name}<span className="block text-xs font-normal text-stone-500">{o.department_name ? "Department" : "Person"}</span></Td>
              <Td>{o.pattern === "flexible" ? "Flexible" : o.pattern === "fixed" ? "Fixed" : "As above"}</Td>
              <Td>{o.start_time ? `${t(o.start_time)} to ${t(o.end_time)}` : o.weekly_hours ? `${Number(o.weekly_hours)} h a week` : "As above"}</Td>
              <Td>{o.grace_minutes != null ? `${o.grace_minutes} min` : "As above"}</Td>
              <Td>{o.break_minutes != null ? `${o.break_minutes} min` : "As above"}</Td>
              <Td>{o.tracked == null ? "As their type" : o.tracked ? "Yes" : "No"}</Td>
              <Td className="text-right">{manage && <button type="button" aria-label="Remove" className="text-stone-400 hover:text-red-600" onClick={() => remove.mutate(o.id)}><Trash2 className="h-4 w-4" /></button>}</Td>
            </tr>
          ))}
        </Table>
      )}
      {editing && <OverrideForm onClose={() => setEditing(false)} />}
    </Card>
  );
}

function OverrideForm({ onClose }: { onClose: () => void }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const [f, setF] = useState({ who: "department", id: "", pattern: "", start_time: "", end_time: "", weekly_hours: "", grace_minutes: "", break_minutes: "", tracked: "" });
  const depts = useQuery({ queryKey: ["departments", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/departments/", wsPath(slug))) });
  const people = useQuery({
    queryKey: ["employees", slug, "picker"],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/employees/", { params: { path: { workspace: slug }, query: { page_size: 500 } as never } })),
  });
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PUT("/api/v1/w/{workspace}/attendance/overrides/", {
      ...wsPath(slug),
      body: {
        department_id: f.who === "department" ? f.id : null, employee_id: f.who === "person" ? f.id : null, pattern: f.pattern as "",
        start_time: f.start_time || null, end_time: f.end_time || null, weekly_hours: f.weekly_hours || null,
        grace_minutes: f.grace_minutes === "" ? null : Number(f.grace_minutes), break_minutes: f.break_minutes === "" ? null : Number(f.break_minutes),
        tracked: f.tracked === "" ? null : f.tracked === "yes",
      },
    })),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["attendance-overrides", slug] }); toast.success("Saved"); onClose(); },
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal open title="Own hours for a department or person" onClose={onClose} size="lg">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="For"><Select value={f.who} onChange={(e) => setF({ ...f, who: e.target.value, id: "" })}><option value="department">A department</option><option value="person">A person</option></Select></Field>
          <Field label={f.who === "department" ? "Department" : "Person"}>
            <Select required value={f.id} onChange={set("id")}>
              <option value="">Choose</option>
              {f.who === "department"
                ? (depts.data?.results ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)
                : (people.data?.results ?? []).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </Select>
          </Field>
          <Field label="Pattern"><Select value={f.pattern} onChange={set("pattern")}><option value="">As above</option><option value="fixed">Fixed hours</option><option value="flexible">Flexible hours</option></Select></Field>
          <Field label="Hours a week (flexible)"><Input type="number" min="1" step="0.5" value={f.weekly_hours} onChange={set("weekly_hours")} placeholder="As above" /></Field>
          <Field label="Start"><Input type="time" value={f.start_time} onChange={set("start_time")} /></Field>
          <Field label="End"><Input type="time" value={f.end_time} onChange={set("end_time")} /></Field>
          <Field label="Grace (minutes)"><Input type="number" min="0" value={f.grace_minutes} onChange={set("grace_minutes")} placeholder="As above" /></Field>
          <Field label="Break (minutes)"><Input type="number" min="0" value={f.break_minutes} onChange={set("break_minutes")} placeholder="As above" /></Field>
          {f.who === "person" && <Field label="Track their time"><Select value={f.tracked} onChange={set("tracked")}><option value="">As their worker type</option><option value="yes">Yes</option><option value="no">No</option></Select></Field>}
        </div>
        <p className="text-xs text-stone-500">Leave a box blank to follow the level above: the department, then the business.</p>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
      </form>
    </Modal>
  );
}
