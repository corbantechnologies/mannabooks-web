"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { AttendanceProfile } from "@/components/attendance-profile";
import { Badge, Button, Card, ErrorState, Spinner, Table, Td } from "@/components/ui";
import { REPORT_STATUS } from "@/lib/api/assets";
import { api, unwrap } from "@/lib/api/client";
import { ADVANCE_STATUS, LEAVE_STATUS } from "@/lib/api/people";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

/** Everything about one person: details, pay, leave, salary advances, work reports and what they did lately. */
export default function EmployeeProfilePage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const record = useQuery({  // the full record, for editing
    queryKey: ["employee", slug, id], enabled: can("employees.manage"),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/employees/{id}/", { params: { path: { workspace: slug, id } } })),
  });
  const q = useQuery({
    queryKey: ["employee-profile", slug, id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/employees/{id}/profile/", { params: { path: { workspace: slug, id } } })),
  });
  if (q.isLoading) return <Spinner />;
  if (q.error) return <ErrorState error={q.error} />;
  const p = q.data!;
  const rec = p.work_reports.record;
  return (
    <div className="space-y-6">
      <Link href={`/w/${slug}/employees`} className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"><ArrowLeft className="h-4 w-4" /> Employees</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{p.full_name}</h1>
          <p className="text-sm text-stone-600">{[p.job_title, p.department, p.branch].filter(Boolean).join(" · ") || "No job title or department yet"}</p>
          <p className="text-xs text-stone-500">
            {p.staff_number}{p.reports_to ? ` · reports to ${p.reports_to}` : ""}{p.hire_date ? ` · joined ${fmtDate(p.hire_date)} (${p.years_of_service} years)` : ""}
            {p.exit_date ? ` · left ${fmtDate(p.exit_date)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={p.status === "active" ? "green" : p.status === "on_leave" ? "amber" : "stone"}>{p.status_label}</Badge>{!p.has_login && <Badge>No login</Badge>}
          {record.data && <Link href={`/w/${slug}/employees/${id}/edit`}><Button variant="secondary"><Pencil className="h-4 w-4" /> Edit{record.data.pending_changes ? " (changes to check)" : ""}</Button></Link>}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <Tile label="Reports on time" value={rec?.on_time_percent == null ? "-" : `${rec.on_time_percent}%`} note={rec ? `${rec.on_time} of ${rec.counted} due${rec.missed ? `, ${rec.missed} never came in` : ""}` : "None due yet"} />
        {p.tasks && <Tile label="Tasks done on time" value={p.tasks.on_time_percent == null ? "-" : `${p.tasks.on_time_percent}%`}
          note={`${p.tasks.done_on_time + p.tasks.done_late} done${p.tasks.done_late ? `, ${p.tasks.done_late} late` : ""} · ${p.tasks.open} open${p.tasks.overdue ? ` (${p.tasks.overdue} overdue)` : ""}${p.tasks.taken_from_department ? ` · took ${p.tasks.taken_from_department} from the department` : ""}${p.tasks.handed_back ? `, handed back ${p.tasks.handed_back}` : ""}`} />}
        <Tile label={`Annual leave left in ${p.leave.year}`} value={`${Number(p.leave.remaining)} days`} note={`${Number(p.leave.taken)} taken · ${Number(p.leave.pending)} waiting`} />
        {p.pay && <Tile label={p.pay.pay_type === "salary" ? "Basic salary" : p.pay.pay_type_label} value={fmt(p.pay.pay_type === "salary" ? p.pay.basic_salary : p.pay.pay_rate)} note={p.pay.pay_type === "salary" ? "a month" : p.pay.pay_type === "daily" ? "a day" : "an hour"} />}
        {p.advances && <Tile label="Advance still owed" value={fmt(p.advances.reduce((s, a) => s + Number(a.outstanding), 0))} note={`${p.advances.length} advance${p.advances.length === 1 ? "" : "s"}`} />}
      </div>

      <AttendanceProfile employeeId={id} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Work reports" empty={!p.work_reports.recent.length && "No reports asked of them yet"}>
          <Table head={["Report", "Due", "Status"]}>
            {p.work_reports.recent.map((r) => (
              <tr key={r.id}><Td>{r.title}{r.period_label ? <span className="text-stone-500">, {r.period_label}</span> : null}</Td><Td>{fmtDate(r.due_date)}</Td>
                <Td><Badge tone={REPORT_STATUS[r.status].tone}>{REPORT_STATUS[r.status].label}</Badge>{r.submitted_late && <span className="ml-1 text-xs text-stone-500">late</span>}</Td></tr>
            ))}
          </Table>
        </Section>

        <Section title="Leave" empty={!p.leave.requests.length && "No leave asked for yet"}>
          {p.leave.days_by_type.length > 0 && <p className="px-4 pt-3 text-xs text-stone-500">Taken in {p.leave.year}: {p.leave.days_by_type.map((d) => `${d.leave_type_label} ${Number(d.days)}`).join(" · ")}</p>}
          <Table head={["Leave", "From", "To", "Days", "Status"]}>
            {p.leave.requests.map((r) => (
              <tr key={r.id}><Td>{r.leave_type_label}</Td><Td>{fmtDate(r.start_date)}</Td><Td>{fmtDate(r.end_date)}</Td><Td className="text-right">{Number(r.days)}</Td>
                <Td><Badge tone={LEAVE_STATUS[r.status].tone}>{LEAVE_STATUS[r.status].label}</Badge></Td></tr>
            ))}
          </Table>
        </Section>

        {p.pay && (
          <Section title="Payslips" empty={!p.pay.payslips.length && "No approved payslips yet"}>
            <Table head={["Period", "Paid", "Gross", "Net"]}>
              {p.pay.payslips.map((s) => (
                <tr key={s.id}><Td><Link className="hover:underline" href={`/w/${slug}/payroll/payslips/${s.id}`}>{s.period}</Link></Td><Td>{fmtDate(s.pay_date)}</Td>
                  <Td className="text-right font-mono">{fmt(s.gross_pay)}</Td><Td className="text-right font-mono">{fmt(s.net_pay)}</Td></tr>
              ))}
            </Table>
          </Section>
        )}

        {p.advances && (
          <Section title="Salary advances" empty={!p.advances.length && "No advances"}>
            <Table head={["Asked", "Amount", "Left", "Status"]}>
              {p.advances.map((a) => (
                <tr key={a.id}><Td>{fmtDate(a.created_at)}</Td><Td className="text-right font-mono">{fmt(a.amount)}</Td>
                  <Td className="text-right font-mono">{Number(a.outstanding) ? fmt(a.outstanding) : ""}</Td>
                  <Td><Badge tone={ADVANCE_STATUS[a.status].tone}>{ADVANCE_STATUS[a.status].label}</Badge></Td></tr>
              ))}
            </Table>
          </Section>
        )}

        {p.activity && (
          <Section title={`In MannaBooks since ${fmtDate(p.activity.since)}`} empty={!p.activity.total && "Nothing recorded in the last 90 days"}>
            <p className="px-4 pt-3 text-sm text-stone-600">{p.activity.by_kind.map((k) => `${k.kind}: ${k.created ? `${k.created} added` : `${k.total} changes`}`).join(" · ")}</p>
            <Table head={["When", "What"]}>
              {p.activity.recent.map((a, i) => (
                <tr key={i}><Td className="whitespace-nowrap text-xs text-stone-500">{fmtDate(a.when)}</Td><Td>{a.action} {a.kind.toLowerCase()}: {a.what}</Td></tr>
              ))}
            </Table>
          </Section>
        )}

        {p.direct_reports.length > 0 && (
          <Section title="Reporting to them">
            <p className="p-4 text-sm text-stone-700">{p.direct_reports.join(", ")}</p>
          </Section>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="break-words text-xl font-semibold tabular-nums sm:text-2xl">{value}</p>
      {note && <p className="text-xs text-stone-500">{note}</p>}
    </Card>
  );
}

function Section({ title, empty, children }: { title: string; empty?: string | false; children?: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <Card>{empty ? <p className="p-4 text-sm text-stone-500">{empty}</p> : children}</Card>
    </section>
  );
}
