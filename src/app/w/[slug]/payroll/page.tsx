"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge, Button, Card, EmptyState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { MONTHS, RUN_STATUS } from "@/lib/api/people";
import { fmt, fmtDate, todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

const WAGE = { daily: "a day", hourly: "an hour" } as Record<string, string>;

export default function PayrollPage() {
  const { slug, can } = useWorkspace();
  const router = useRouter();
  const runs = useQuery({ queryKey: ["pay-runs", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/pay-runs/", wsPath(slug))) });
  const now = new Date();
  const [kind, setKind] = useState<"monthly" | "casual">("monthly");
  const [form, setForm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [casual, setCasual] = useState({ title: "", period_start: todayIso(), period_end: todayIso(), pay_date: "", apply_statutory: false });
  const [picked, setPicked] = useState<string[] | null>(null);
  const [creating, setCreating] = useState(false);
  const staff = useQuery({
    queryKey: ["employees", slug, "for-pay"], enabled: creating && kind === "casual",
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/employees/", { params: { path: { workspace: slug }, query: { page_size: 200 } } })),
  });
  const people = (staff.data?.results ?? []).filter((e) => e.status !== "exited");
  // first time: everyone on a daily or hourly wage
  const chosen = picked ?? people.filter((e) => e.pay_type === "daily" || e.pay_type === "hourly").map((e) => e.id);
  const create = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/pay-runs/", {
      ...wsPath(slug),
      body: (kind === "monthly" ? { kind, ...form } : { kind, ...casual, pay_date: casual.pay_date || undefined, employee_ids: chosen }) as never,
    })),
    onSuccess: (r) => router.push(`/w/${slug}/payroll/${r.id}`),
  });
  const rows = runs.data?.results ?? [];
  const toggle = (id: string) => setPicked(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);
  return (
    <div className="w-full">
      <PageHeader title="Payroll" guide="payroll"
        description="The monthly payroll with PAYE, SHIF, NSSF and the Housing Levy worked out, and casual or wage pay for any period, with or without statutory deductions."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/w/${slug}/payroll/rates`}><Button variant="secondary"><Settings className="h-4 w-4" /> Statutory rates</Button></Link>
            {can("payroll.manage") && <Button onClick={() => { create.reset(); setPicked(null); setCreating(true); }}><Plus className="h-4 w-4" /> Pay staff</Button>}
          </div>
        } />
      <Card>
        {runs.isLoading ? <div className="px-4"><Spinner /></div> : rows.length === 0 ? <EmptyState title="No payrolls yet">Tick &quot;On the monthly payroll&quot; and enter the salary or wage on each employee, or pay casuals with Pay staff.</EmptyState> : (
          <Table head={["Payroll", "Pay date", "Staff", "Gross", "Net pay", "Status"]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50">
                <Td>
                  <Link href={`/w/${slug}/payroll/${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                  <div className="text-xs text-stone-500">{r.kind === "casual" ? `Casual pay${r.apply_statutory ? "" : ", no statutory"}` : "Monthly payroll"}</div>
                </Td>
                <Td>{fmtDate(r.pay_date)}</Td>
                <Td className="text-right">{r.employees}</Td>
                <Td className="text-right font-mono">{fmt(r.gross_pay)}</Td>
                <Td className="text-right font-mono">{fmt(r.net_pay)}</Td>
                <Td><Badge tone={RUN_STATUS[r.status ?? "draft"].tone}>{RUN_STATUS[r.status ?? "draft"].label}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={creating} title="Pay staff" onClose={() => setCreating(false)} size={kind === "casual" ? "lg" : "md"}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <div className="grid gap-2 sm:grid-cols-2">
            {([["monthly", "Monthly payroll", "Everyone on the monthly payroll, with statutory deductions."],
               ["casual", "Casual or wage pay", "Any period and anyone you choose. No statutory unless you switch it on."]] as const).map(([k, title, text]) => (
              <label key={k} className={`cursor-pointer rounded-md border p-3 text-sm ${kind === k ? "border-brand-600 bg-brand-50" : "border-stone-200 hover:bg-stone-50"}`}>
                <input type="radio" className="sr-only" checked={kind === k} onChange={() => setKind(k)} />
                <span className="block font-medium text-stone-900">{title}</span><span className="block text-xs text-stone-600">{text}</span>
              </label>
            ))}
          </div>
          {kind === "monthly" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Month"><Select value={form.month} onChange={(e) => setForm((p) => ({ ...p, month: Number(e.target.value) }))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</Select></Field>
                <Field label="Year"><Select value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: Number(e.target.value) }))}>{[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}</Select></Field>
              </div>
              <p className="text-sm text-stone-600">A payslip is made for everyone on the monthly payroll: salaries with their allowances, deductions and unpaid leave, and wages to fill in with days or hours. Each person&apos;s statutory ticks apply. You can change payslips before approving.</p>
            </>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><Field label="Title (optional)"><Input value={casual.title} onChange={(e) => setCasual((p) => ({ ...p, title: e.target.value }))} placeholder="Site casuals, week 45" /></Field></div>
                <Field label="From"><Input type="date" required value={casual.period_start} onChange={(e) => setCasual((p) => ({ ...p, period_start: e.target.value }))} /></Field>
                <Field label="To"><Input type="date" required value={casual.period_end} onChange={(e) => setCasual((p) => ({ ...p, period_end: e.target.value }))} /></Field>
                <Field label="Pay date" hint="Blank: the last day."><Input type="date" value={casual.pay_date} onChange={(e) => setCasual((p) => ({ ...p, pay_date: e.target.value }))} /></Field>
              </div>
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={casual.apply_statutory} onChange={(e) => setCasual((p) => ({ ...p, apply_statutory: e.target.checked }))} />
                <span>Deduct statutory (PAYE, NSSF, SHIF, Housing Levy)<span className="block text-xs text-stone-500">Each person&apos;s own ticks still apply. Off: everyone is paid in full.</span></span></label>
              <div>
                <p className="text-sm font-medium text-stone-700">Who to pay ({chosen.length})</p>
                {staff.isLoading ? <Spinner /> : people.length === 0 ? <p className="text-sm text-stone-500">Add the people first under Employees.</p> : (
                  <ul className="mt-1 max-h-60 divide-y divide-stone-100 overflow-y-auto rounded-md border border-stone-200">
                    {people.map((e) => (
                      <li key={e.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-stone-50">
                          <input type="checkbox" checked={chosen.includes(e.id)} onChange={() => toggle(e.id)} />
                          <span className="min-w-0 flex-1 truncate">{e.full_name}</span>
                          <span className="text-xs text-stone-500">{e.pay_type && WAGE[e.pay_type] ? `${fmt(e.pay_rate ?? "0")} ${WAGE[e.pay_type]}` : "Amount to enter"}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-1 text-xs text-stone-500">Enter the days, hours or amount on each payslip next. For casuals paid every month, use one run for the whole month, or put them on the monthly payroll with their statutory unticked.</p>
              </div>
            </>
          )}
          <FormError error={create.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
            <Button type="submit" loading={create.isPending} disabled={kind === "casual" && chosen.length === 0}>Create payslips</Button></div>
        </form>
      </Modal>
    </div>
  );
}
