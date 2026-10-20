"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { ApprovalPanel } from "@/components/approval-panel";
import { Meta } from "@/components/document-view";
import { PayItemsEditor } from "@/components/pay-items";
import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { useBankAccounts } from "@/lib/api/banking";
import { api, unwrap } from "@/lib/api/client";
import { useApprovalStatus } from "@/lib/api/control";
import { PayItem, REMITTANCES, RUN_STATUS } from "@/lib/api/people";
import type { Payslip } from "@/lib/api/types";
import { downloadCsv, fmt, fmtDate, todayIso } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function PayRunPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const approval = useApprovalStatus(slug, "pay_run", id);
  const router = useRouter();
  const path = { params: { path: { workspace: slug, id } } };
  const accounts = useBankAccounts(slug);
  const [editing, setEditing] = useState<Payslip | null>(null);
  const [paying, setPaying] = useState<null | "pay" | "paye" | "shif" | "nssf" | "housing_levy">(null);
  const [payForm, setPayForm] = useState({ bank_account_id: "", date: todayIso(), reference: "" });
  const run = useQuery({ queryKey: ["pay-run", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/pay-runs/{id}/", path)) });
  const slips = useQuery({
    queryKey: ["payslips", slug, id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/payslips/", { params: { path: { workspace: slug }, query: { pay_run: id, page_size: 500 } } })),
  });
  const act = useMutation({
    mutationFn: async (body: Record<string, unknown>) => unwrap(await api.POST("/api/v1/w/{workspace}/pay-runs/{id}/action/", { ...path, body: body as never })),
    onSuccess: (r) => { toast.success(RUN_STATUS[r.status ?? "draft"].label); setPaying(null); },
    onError: (e) => { if (!paying) toast.error(e.message); },
  });
  const remove = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/w/{workspace}/pay-runs/{id}/", path)),
    onSuccess: () => { toast.success("Payroll deleted"); router.replace(`/w/${slug}/payroll`); },
  });
  if (run.isLoading) return <Spinner />;
  if (run.error) return <ErrorState error={run.error} />;
  const r = run.data!;
  const rows = slips.data?.results ?? [];
  const draft = r.status === "draft";
  const remitted = (r.remittances ?? {}) as Record<string, { amount: string; date: string; reference: string }>;
  const active = (accounts.data?.results ?? []).filter((a) => a.is_active);
  function exportBank() {
    downloadCsv(`salaries-${r.year}-${r.month}.csv`, [["Staff no.", "Name", "Paid by", "Pay to", "Net pay"], ...rows.map((s) => [s.staff_number, s.employee_name, s.pay_method, s.pay_to, s.net_pay])]);
  }
  function exportStatutory() {
    downloadCsv(`statutory-${r.year}-${r.month}.csv`, [["Staff no.", "Name", "KRA PIN", "NSSF no.", "SHIF no.", "Gross", "Taxable", "PAYE", "SHIF", "NSSF (employee)", "NSSF (employer)", "Housing Levy (employee)", "Housing Levy (employer)"],
      ...rows.map((s) => [s.staff_number, s.employee_name, s.kra_pin, s.nssf_number, s.shif_number, s.gross_pay, s.taxable_pay, s.paye, s.shif, s.nssf_employee, s.nssf_employer, s.housing_levy_employee, s.housing_levy_employer])]);
  }
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/payroll`} className="text-sm text-stone-500 hover:underline">&larr; Payroll</Link>
      <PageHeader title={`Payroll ${r.name}`} description={`Pay date ${fmtDate(r.pay_date)} · ${r.employees} staff`} guide="payroll"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportBank}>Bank / M-Pesa list</Button>
            <Button variant="secondary" onClick={exportStatutory}>Statutory schedule</Button>
            {draft && can("payroll.manage") && <Button variant="ghost" className="text-red-600" onClick={() => confirm("Delete this payroll?") && remove.mutate()}>Delete</Button>}
            {draft && can("payroll.approve") && !approval.data?.required && <Button loading={act.isPending} onClick={() => act.mutate({ action: "approve" })}>Approve</Button>}
            {r.status === "approved" && can("payroll.approve") && <Button variant="secondary" onClick={() => confirm("Reopen to change payslips?") && act.mutate({ action: "reopen" })}>Reopen</Button>}
            {r.status === "approved" && can("payroll.manage") && <Button onClick={() => { act.reset(); setPaying("pay"); }}>Record salaries paid</Button>}
          </div>
        } />
      <ApprovalPanel docType="pay_run" id={id} />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-4">
        <Meta label="Status"><Badge tone={RUN_STATUS[r.status ?? "draft"].tone}>{RUN_STATUS[r.status ?? "draft"].label}</Badge></Meta>
        <Meta label="Gross pay">{fmt(r.gross_pay)}</Meta>
        <Meta label="Net pay">{fmt(r.net_pay)}</Meta>
        <Meta label="Cost to the business">{fmt(r.employer_cost)}</Meta>
      </Card>
      <h2 className="mb-2 text-sm font-semibold">Statutory deductions</h2>
      <Card className="mb-6">
        <Table head={["", "Amount", "Pay to", "Paid"]}>
          {REMITTANCES.map((m) => (
            <tr key={m.kind}>
              <Td className="font-medium">{m.label}</Td>
              <Td className="text-right font-mono">{fmt((r as Record<string, unknown>)[m.total] as string)}</Td>
              <Td className="text-stone-500">{m.to}</Td>
              <Td>{remitted[m.kind] ? <Badge tone="green">Paid {fmtDate(remitted[m.kind].date)}</Badge> : r.status !== "draft" && can("payroll.manage") ? <Button variant="ghost" className="px-2 py-1" onClick={() => { act.reset(); setPaying(m.kind); }}>Record paid</Button> : "-"}</Td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card className="overflow-x-auto">
        <Table head={["Employee", "Gross", "PAYE", "SHIF", "NSSF", "Housing", "Other", "Net pay", ""]}>
          {rows.map((s) => (
            <tr key={s.id}>
              <Td><span className="font-medium">{s.employee_name}</span><div className="text-xs text-stone-500">{s.staff_number}{Number(s.unpaid_leave_days) ? ` · ${Number(s.unpaid_leave_days)} unpaid days` : ""}</div></Td>
              <Td className="text-right font-mono">{fmt(s.gross_pay)}</Td>
              <Td className="text-right font-mono">{fmt(s.paye)}</Td>
              <Td className="text-right font-mono">{fmt(s.shif)}</Td>
              <Td className="text-right font-mono">{fmt(s.nssf_employee)}</Td>
              <Td className="text-right font-mono">{fmt(s.housing_levy_employee)}</Td>
              <Td className="text-right font-mono">{Number(s.other_deductions) ? fmt(s.other_deductions) : ""}</Td>
              <Td className="text-right font-mono font-semibold">{fmt(s.net_pay)}</Td>
              <Td className="whitespace-nowrap">
                {draft && can("payroll.manage") && <Button variant="ghost" className="px-2 py-1" onClick={() => setEditing(s)}>Edit</Button>}
                <Link href={`/w/${slug}/payroll/payslips/${s.id}`} className="ml-1 text-sm text-brand-700 hover:underline">Payslip</Link>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
      {editing && <EditSlip slip={editing} onClose={() => setEditing(null)} />}
      <Modal open={paying !== null} title={paying === "pay" ? `Net salaries ${fmt(r.net_pay)}` : `${REMITTANCES.find((m) => m.kind === paying)?.label ?? ""} paid`} onClose={() => setPaying(null)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); act.mutate(paying === "pay" ? { action: "pay", ...payForm, bank_account_id: payForm.bank_account_id || active.find((a) => a.kind === "bank")?.id } : { action: "remit", kind: paying, ...payForm, bank_account_id: payForm.bank_account_id || active.find((a) => a.kind === "bank")?.id }); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Paid from"><Select value={payForm.bank_account_id || active.find((a) => a.kind === "bank")?.id || ""} onChange={(e) => setPayForm((p) => ({ ...p, bank_account_id: e.target.value }))}>{active.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
            <Field label="Date"><Input type="date" value={payForm.date} onChange={(e) => setPayForm((p) => ({ ...p, date: e.target.value }))} /></Field>
            {paying !== "pay" && <div className="col-span-2"><Field label="Payment reference" hint="e.g. the KRA payment registration number (PRN)."><Input value={payForm.reference} onChange={(e) => setPayForm((p) => ({ ...p, reference: e.target.value }))} /></Field></div>}
          </div>
          <FormError error={act.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setPaying(null)}>Cancel</Button><Button type="submit" loading={act.isPending}>Record</Button></div>
        </form>
      </Modal>
    </div>
  );
}

function EditSlip({ slip, onClose }: { slip: Payslip; onClose: () => void }) {
  const { slug } = useWorkspace();
  const [form, setForm] = useState({ basic_salary: String(Number(slip.basic_salary)), unpaid_leave_days: String(Number(slip.unpaid_leave_days)), items: (slip.items ?? []) as PayItem[] });
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PATCH("/api/v1/w/{workspace}/payslips/{id}/", {
      params: { path: { workspace: slug, id: slip.id } },
      body: { basic_salary: form.basic_salary, unpaid_leave_days: form.unpaid_leave_days, items: form.items.filter((i) => i.name && Number(i.amount)).map((i) => ({ ...i, amount: String(i.amount), taxable: i.taxable ?? true })) },
    })),
    onSuccess: (s) => { toast.success(`${s.employee_name}: net pay ${fmt(s.net_pay)}`); onClose(); },
  });
  return (
    <Modal open title={`${slip.employee_name}, this month`} onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Basic salary"><Input inputMode="decimal" value={form.basic_salary} onChange={(e) => setForm((p) => ({ ...p, basic_salary: e.target.value }))} /></Field>
          <Field label="Unpaid leave days"><Input inputMode="decimal" value={form.unpaid_leave_days} onChange={(e) => setForm((p) => ({ ...p, unpaid_leave_days: e.target.value }))} /></Field>
        </div>
        <PayItemsEditor items={form.items} onChange={(items) => setForm((p) => ({ ...p, items }))} hint="This month only: overtime, bonus, advance." />
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Save and recalculate</Button></div>
      </form>
    </Modal>
  );
}
