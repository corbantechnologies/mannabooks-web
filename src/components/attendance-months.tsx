"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, Field, FormError, Input, Modal, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { hours } from "@/lib/attendance";
import type { components } from "@/lib/api/schema";
import { useWorkspace } from "@/lib/workspace";

type Row = components["schemas"]["AttendanceTimesheet"];

function lastMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Months: each person's days, lateness, hours and extra hours. The supervisor or department head approves the month;
 * approved months are locked and payroll uses them (waged days or hours, and extra hours). */
export function AttendanceMonths() {
  const { slug, can } = useWorkspace();
  const qc = useQueryClient();
  const [month, setMonth] = useState(lastMonth());
  const [approving, setApproving] = useState<Row | null>(null);
  const q = useQuery({
    queryKey: ["attendance-months", slug, month],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/attendance/timesheets/", { params: { path: { workspace: slug }, query: { month: `${month}-01` } } })),
  });
  const reopen = useMutation({
    mutationFn: async (r: Row) => unwrap(await api.POST("/api/v1/w/{workspace}/attendance/timesheets/reopen/", {
      params: { path: { workspace: slug } }, body: { employee_id: r.employee_id, month: `${month}-01` },
    })),
    onSuccess: () => { toast.success("Opened again"); void qc.invalidateQueries({ queryKey: ["attendance-months", slug] }); },
    onError: (e) => toast.error(e.message),
  });
  const rows = q.data ?? [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Month"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
        <p className="pb-2 text-sm text-stone-600">Approve each person&apos;s month once it has ended. It is then locked, and payroll uses it: days or hours for waged staff, and approved extra hours.</p>
      </div>
      <Card>
        {q.isLoading ? <div className="p-4"><Spinner /></div> : rows.length === 0 ? <EmptyState title="Nobody to show" /> : (
          <Table head={["Person", "Days", "Absent", "Leave", "Late", "Hours", "Extra hours", "Pays", "Status", ""]}>
            {rows.map((r) => (
              <tr key={r.employee_id}>
                <Td><span className="font-medium">{r.name}</span><span className="block text-xs text-stone-500">{r.department}</span></Td>
                <Td className="text-right font-mono">{r.days_worked}{r.half_days ? ` + ${r.half_days} half` : ""}</Td>
                <Td className="text-right font-mono">{r.absent || "-"}</Td>
                <Td className="text-right font-mono">{r.on_leave || "-"}</Td>
                <Td className="text-right font-mono">{r.late_days ? `${r.late_days} (${hours(r.late_minutes)})` : "-"}</Td>
                <Td className="text-right font-mono">{hours(r.minutes)}</Td>
                <Td className="text-right font-mono">
                  {r.extra_normal_minutes || r.extra_rest_minutes ? <>
                    {r.extra_normal_minutes ? hours(r.extra_normal_minutes) : ""}{r.extra_rest_minutes ? <span className="block text-xs">{hours(r.extra_rest_minutes)} rest days</span> : null}
                  </> : "-"}
                </Td>
                <Td className="text-right font-mono">{r.units != null ? `${Number(r.units)} ${r.pay_type === "hourly" ? "h" : "days"}` : "Salary"}</Td>
                <Td><Badge tone={r.status === "approved" ? "green" : "stone"}>{r.status === "approved" ? "Approved" : "Open"}</Badge>{r.approved_by_name && <span className="block text-xs text-stone-500">{r.approved_by_name}</span>}</Td>
                <Td className="text-right">
                  {r.status === "open" && r.can_approve && r.month_ended && <Button variant="secondary" onClick={() => setApproving(r)}>Approve</Button>}
                  {r.status === "approved" && can("attendance.manage") && <Button variant="ghost" loading={reopen.isPending} onClick={() => reopen.mutate(r)}>Open again</Button>}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {approving && <Approve row={approving} month={month} onClose={() => setApproving(null)} />}
    </div>
  );
}

function Approve({ row, month, onClose }: { row: Row; month: string; onClose: () => void }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const [normal, setNormal] = useState(String(Math.round(row.extra_normal_minutes / 6) / 10));
  const [rest, setRest] = useState(String(Math.round(row.extra_rest_minutes / 6) / 10));
  const [note, setNote] = useState("");
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/attendance/timesheets/approve/", {
      params: { path: { workspace: slug } },
      body: { employee_id: row.employee_id, month: `${month}-01`, extra_normal_minutes: Math.round(Number(normal || 0) * 60), extra_rest_minutes: Math.round(Number(rest || 0) * 60), note },
    })),
    onSuccess: () => { toast.success(`${row.name}'s month approved`); void qc.invalidateQueries({ queryKey: ["attendance-months", slug] }); onClose(); },
  });
  return (
    <Modal open title={`Approve ${row.name}'s month`} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <p className="text-sm text-stone-600">
          {row.days_worked} days{row.half_days ? ` and ${row.half_days} half days` : ""}, {hours(row.minutes)} in all{row.late_days ? `, late on ${row.late_days} days` : ""}.
          {row.units != null ? ` Payroll will pay ${Number(row.units)} ${row.pay_type === "hourly" ? "hours" : "days"}.` : ""}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Extra hours on normal days" hint="As worked out; change it if needed"><Input type="number" min="0" step="0.1" value={normal} onChange={(e) => setNormal(e.target.value)} /></Field>
          <Field label="Extra hours on rest days and holidays"><Input type="number" min="0" step="0.1" value={rest} onChange={(e) => setRest(e.target.value)} /></Field>
        </div>
        <Field label="Note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <p className="text-xs text-stone-500">Once approved the month is locked: no more corrections or register changes. HR can open it again until its payroll is approved.</p>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Approve the month</Button></div>
      </form>
    </Modal>
  );
}
