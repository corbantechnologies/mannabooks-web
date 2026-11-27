"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Settings } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { AttendanceHoursVsPay } from "@/components/attendance-hours";
import { AttendanceMonths } from "@/components/attendance-months";
import { AttendanceShifts } from "@/components/attendance-shifts";
import { Sessions } from "@/components/attendance-sessions";
import { ClockCard } from "@/components/clock-card";
import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { type AttendancePerson, DAY_STATUS, hm, hours } from "@/lib/attendance";
import { fmtDate, todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";
import { useFormParam } from "@/lib/page-form";

type Tab = "mine" | "now" | "register" | "corrections" | "months" | "hours" | "shifts";

/** Attendance: your own days, Who's in now and the day register for your team, and corrections to decide. */
export default function AttendancePage() {
  const [shiftForm] = useFormParam("shift");
  const { slug, can } = useWorkspace();
  const params = useSearchParams();
  const me = useQuery({ queryKey: ["attendance-me", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/attendance/me/", wsPath(slug))) });
  const lead = me.data?.can_approve ?? false;
  const [tab, setTab] = useState<Tab>(() => (params.get("tab") as Tab) || "mine");
  const tabs: [Tab, string][] = [["mine", "My days"], ...(lead ? [["now", "Who's in now"], ["register", "Day register"], ["corrections", "Corrections"]] as [Tab, string][] : []),
    ["months", lead ? "Months" : "My months"], ["hours", "Hours vs pay"], ...((lead || can("attendance.manage")) ? [["shifts", "Shifts"]] as [Tab, string][] : [])];
  if (shiftForm) return <AttendanceShifts />;  // a shift, as a page
  if (me.isLoading) return <Spinner />;
  if (me.error) return <ErrorState error={me.error} />;
  return (
    <div className="w-full">
      <PageHeader title="Attendance" guide="attendance"
        description="Clock in and out from your phone or computer. Supervisors see who's in and keep the day register for people who don't clock in."
        actions={can("attendance.manage") && <Link href={`/w/${slug}/attendance/settings`}><Button variant="secondary"><Settings className="h-4 w-4" /> Settings</Button></Link>} />
      {!me.data?.enabled ? (
        <Card><EmptyState title="Attendance is off">{can("attendance.manage")
          ? <>Switch it on under <Link className="text-brand-700 hover:underline" href={`/w/${slug}/attendance/settings`}>Settings</Link>, set your hours and office networks, then staff can clock in.</>
          : "Ask HR or an admin to switch it on."}</EmptyState></Card>
      ) : (
        <>
          <div className="mb-4 -mb-px flex gap-1 overflow-x-auto border-b border-stone-200">
            {tabs.map(([k, label]) => (
              <button key={k} type="button" onClick={() => setTab(k)}
                className={clsx("shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm", tab === k ? "border-brand-700 font-medium text-brand-800" : "border-transparent text-stone-500 hover:text-stone-800")}>{label}</button>
            ))}
          </div>
          {tab === "mine" && <MyDays employeeId={me.data.employee_id} tracked={me.data.tracked} />}
          {tab === "now" && <People />}
          {tab === "register" && <Register />}
          {tab === "corrections" && <Corrections box="to_decide" />}
          {tab === "months" && <AttendanceMonths />}
          {tab === "hours" && <AttendanceHoursVsPay />}
          {tab === "shifts" && <AttendanceShifts />}
        </>
      )}
    </div>
  );
}

function MyDays({ employeeId, tracked }: { employeeId: string | null; tracked: boolean }) {
  const { slug } = useWorkspace();
  const [asking, setAsking] = useState(false);
  const days = useQuery({
    queryKey: ["attendance-days", slug, employeeId], enabled: Boolean(employeeId && tracked),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/attendance/people/{employee_id}/days/", { params: { path: { workspace: slug, employee_id: employeeId! } } })),
  });
  if (!employeeId) return <Card><EmptyState title="Your login isn't linked to an employee record">Ask HR to link it on your employee record, then you can clock in.</EmptyState></Card>;
  if (!tracked) return <Card><EmptyState title="Your time isn't tracked">Ask HR if it should be.</EmptyState></Card>;
  return (
    <div className="space-y-5">
      <ClockCard />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">The last two weeks</h2>
        <Button variant="secondary" onClick={() => setAsking(true)}>Ask for a fix</Button>
      </div>
      <Card>
        {days.isLoading ? <div className="p-4"><Spinner /></div> : (
          <Table head={["Day", "Status", "In and out", "Worked", "Late", ""]}>
            {(days.data ?? []).filter((d) => d.status !== "not_tracked").map((d) => (
              <tr key={d.day}>
                <Td className="whitespace-nowrap">{fmtDate(d.day)}</Td>
                <Td><Badge tone={DAY_STATUS[d.status]?.[1] ?? "stone"}>{DAY_STATUS[d.status]?.[0] ?? d.status}</Badge>{d.shift_name && <span className="ml-1 text-xs text-sky-800">{d.shift_name}</span>}</Td>
                <Td className="text-right"><Sessions events={d.events} /></Td>
                <Td className="text-right font-mono">{d.minutes ? hours(d.minutes) : "-"}</Td>
                <Td className="text-right font-mono">{d.late_minutes ? hours(d.late_minutes) : "-"}</Td>
                <Td className="text-xs text-stone-500">{d.missed_break && <span className="mr-2 font-medium text-amber-700">No break for {hours(d.longest_stretch)}</span>}{d.elsewhere ? "Away from the office" : ""}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <p className="text-xs text-stone-500">Each clock-in to its clock-out, with breaks under it; Worked is the total, less unpaid breaks. * Closed automatically: no clock-out. Ask for a fix if the time is wrong.</p>
      <h2 className="text-sm font-semibold">My corrections</h2>
      <Corrections box="mine" />
      {asking && <AskFix onClose={() => setAsking(false)} />}
    </div>
  );
}

function AskFix({ onClose }: { onClose: () => void }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const [f, setF] = useState({ day: todayIso(), kind: "in", time: "08:00", reason: "" });
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/attendance/corrections/", { ...wsPath(slug), body: { ...f, kind: f.kind as "in" } as never })),
    onSuccess: () => { toast.success("Sent to your supervisor"); void qc.invalidateQueries({ queryKey: ["attendance-corrections", slug] }); onClose(); },
  });
  return (
    <Modal open title="Ask for a fix" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Day"><Input type="date" required max={todayIso()} value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} /></Field>
          <Field label="What"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
            <option value="in">Clock-in</option><option value="out">Clock-out</option><option value="break_start">Break start</option><option value="break_end">Break end</option>
          </Select></Field>
          <Field label="Right time"><Input type="time" required value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
        </div>
        <Field label="Why"><Input required value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="e.g. My phone was off when I arrived" /></Field>
        <p className="text-xs text-stone-500">Your supervisor or department head decides. The original time stays on record.</p>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Send</Button></div>
      </form>
    </Modal>
  );
}

function People() {
  const { slug } = useWorkspace();
  const q = useQuery({
    queryKey: ["attendance-people", slug, "now"], refetchInterval: 60000,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/attendance/people/", wsPath(slug))),
  });
  const rows = q.data ?? [];
  const count = (k: string[]) => rows.filter((r) => k.includes(r.status)).length;
  if (q.isLoading) return <Spinner />;
  if (q.error) return <ErrorState error={q.error} />;
  return (
    <div className="space-y-4">
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
        <span><b className="text-emerald-700">{count(["in", "present"])}</b> in</span>
        <span><b className="text-sky-700">{count(["on_break"])}</b> on a break</span>
        <span><b className="text-amber-700">{count(["not_in_yet"])}</b> not in yet</span>
        <span><b>{count(["on_leave"])}</b> on leave</span>
        <span><b>{count(["gone_home"])}</b> gone home</span>
      </p>
      <Card>
        {rows.length === 0 ? <EmptyState title="Nobody to show">People on your team, or in departments you head, show here.</EmptyState> : (
          <Table head={["Person", "Status", "In and out", "Worked", "Active"]}>
            {rows.map((r) => <PersonRow key={r.employee_id} r={r} />)}
          </Table>
        )}
      </Card>
    </div>
  );
}

function PersonRow({ r }: { r: AttendancePerson }) {
  const s = DAY_STATUS[r.status];
  return (
    <tr>
      <Td><span className="font-medium">{r.name}</span><span className="block text-xs text-stone-500">{[r.job_title, r.department].filter(Boolean).join(" · ")}</span></Td>
      <Td>
        <Badge tone={s?.[1] ?? "stone"}>{s?.[0] ?? r.status}</Badge>
        {r.late_minutes > 0 && <span className="ml-1 text-xs text-amber-700">{hours(r.late_minutes)} late</span>}
        {r.elsewhere && <span className="ml-1 text-xs text-stone-500">away from office</span>}
      </Td>
      <Td className="text-right"><Sessions events={r.events} showBreaks={false} /></Td>
      <Td className="text-right font-mono">{r.minutes ? hours(r.minutes) : "-"}</Td>
      <Td className="whitespace-nowrap text-xs">
        {!r.has_login ? <span className="text-stone-400">No login</span> : r.active_now
          ? <span className="inline-flex items-center gap-1 text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Active now</span>
          : <span className="text-stone-500">{r.last_active_at ? `Last seen ${fmtDate(r.last_active_at)} ${hm(r.last_active_at)}` : "Not yet"}</span>}
      </Td>
    </tr>
  );
}

function Register() {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const [day, setDay] = useState(todayIso());
  const [marks, setMarks] = useState<Record<string, string>>({});
  const q = useQuery({
    queryKey: ["attendance-people", slug, day],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/attendance/people/", { params: { path: { workspace: slug }, query: { day } } })),
  });
  const rows = (q.data ?? []).filter((r) => r.can_approve);
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/attendance/register/", {
      ...wsPath(slug), body: { day, rows: Object.entries(marks).map(([employee_id, mark]) => ({ employee_id, mark: mark as "present" })) },
    })),
    onSuccess: () => { toast.success("Register saved"); setMarks({}); void qc.invalidateQueries({ queryKey: ["attendance-people", slug] }); },
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Day"><Input type="date" max={todayIso()} value={day} onChange={(e) => { setDay(e.target.value); setMarks({}); }} /></Field>
        <p className="pb-2 text-sm text-stone-600">For people who don&apos;t clock in themselves, such as casuals without a phone. A mark doesn&apos;t replace someone&apos;s own clock-in.</p>
      </div>
      <Card>
        {q.isLoading ? <div className="p-4"><Spinner /></div> : rows.length === 0 ? <EmptyState title="Nobody on your team" /> : (
          <Table head={["Person", "Today", "Mark"]}>
            {rows.map((r) => (
              <tr key={r.employee_id}>
                <Td><span className="font-medium">{r.name}</span><span className="block text-xs text-stone-500">{r.employment_type.replace(/_/g, " ")}{r.has_login ? "" : " · no login"}</span></Td>
                <Td><Badge tone={DAY_STATUS[r.status]?.[1] ?? "stone"}>{DAY_STATUS[r.status]?.[0] ?? r.status}</Badge></Td>
                <Td>
                  <Select aria-label={`Mark ${r.name}`} className="w-36" value={marks[r.employee_id] ?? r.register_mark ?? ""} onChange={(e) => setMarks({ ...marks, [r.employee_id]: e.target.value })}>
                    <option value="">No mark</option><option value="present">Present</option><option value="half_day">Half day</option><option value="absent">Absent</option>
                  </Select>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <FormError error={save.error} />
      <div className="flex justify-end"><Button disabled={!Object.keys(marks).length} loading={save.isPending} onClick={() => save.mutate()}>Save the register</Button></div>
    </div>
  );
}

function Corrections({ box }: { box: "mine" | "to_decide" }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const q = useQuery({
    queryKey: ["attendance-corrections", slug, box],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/attendance/corrections/", { params: { path: { workspace: slug }, query: { box } } })),
  });
  const decide = useMutation({
    mutationFn: async (v: { id: string; decision: "approve" | "decline" }) => unwrap(await api.POST("/api/v1/w/{workspace}/attendance/corrections/{id}/decide/", {
      params: { path: { workspace: slug, id: v.id } }, body: { decision: v.decision, reason },
    })),
    onSuccess: (c) => { toast.success(c.status === "approved" ? "Approved" : "Declined"); setDeclining(null); setReason(""); void qc.invalidateQueries({ queryKey: ["attendance-corrections", slug] }); },
    onError: (e) => toast.error(e.message),
  });
  const rows = q.data ?? [];
  if (q.isLoading) return <Spinner />;
  return (
    <Card>
      {rows.length === 0 ? <EmptyState title={box === "mine" ? "No corrections asked for" : "Nothing waiting for you"} /> : (
        <Table head={[...(box === "mine" ? [] : ["Person"]), "Day", "Fix", "Why", "Status", ""]}>
          {rows.map((c) => (
            <tr key={c.id}>
              {box !== "mine" && <Td className="font-medium">{c.employee_name}</Td>}
              <Td className="whitespace-nowrap">{fmtDate(c.day)}</Td>
              <Td className="whitespace-nowrap">{c.kind_label} at {c.time.slice(0, 5)}</Td>
              <Td className="text-sm">{c.reason}{c.decline_reason ? <span className="block text-xs text-red-700">Declined: {c.decline_reason}</span> : null}</Td>
              <Td><Badge tone={c.status === "approved" ? "green" : c.status === "declined" ? "red" : "amber"}>{c.status_label}</Badge></Td>
              <Td className="text-right">
                {c.can_decide && (
                  <span className="flex justify-end gap-2">
                    <Button variant="secondary" loading={decide.isPending} onClick={() => decide.mutate({ id: c.id, decision: "approve" })}>Approve</Button>
                    <Button variant="ghost" onClick={() => setDeclining(c.id)}>Decline</Button>
                  </span>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={declining !== null} title="Decline the correction" onClose={() => setDeclining(null)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (declining) decide.mutate({ id: declining, decision: "decline" }); }}>
          <Field label="Why"><Input required value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setDeclining(null)}>Cancel</Button><Button type="submit" loading={decide.isPending}>Decline</Button></div>
        </form>
      </Modal>
    </Card>
  );
}
