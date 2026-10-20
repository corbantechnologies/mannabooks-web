"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge, Button, Card, EmptyState, Field, FormError, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { MONTHS, RUN_STATUS } from "@/lib/api/people";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function PayrollPage() {
  const { slug, can } = useWorkspace();
  const router = useRouter();
  const runs = useQuery({ queryKey: ["pay-runs", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/pay-runs/", wsPath(slug))) });
  const now = new Date();
  const [form, setForm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [creating, setCreating] = useState(false);
  const create = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/pay-runs/", { ...wsPath(slug), body: form })),
    onSuccess: (r) => router.push(`/w/${slug}/payroll/${r.id}`),
  });
  const rows = runs.data?.results ?? [];
  return (
    <div className="w-full">
      <PageHeader title="Payroll" description="Monthly payroll with PAYE, SHIF, NSSF and the Housing Levy worked out, posted to the books, and payslips for staff." guide="payroll"
        actions={
          <div className="flex gap-2">
            <Link href={`/w/${slug}/payroll/rates`}><Button variant="secondary"><Settings className="h-4 w-4" /> Statutory rates</Button></Link>
            {can("payroll.manage") && <Button onClick={() => { create.reset(); setCreating(true); }}><Plus className="h-4 w-4" /> Run payroll</Button>}
          </div>
        } />
      <Card>
        {runs.isLoading ? <div className="px-4"><Spinner /></div> : rows.length === 0 ? <EmptyState title="No payrolls yet">First tick &quot;Paid through payroll&quot; and enter the salary on each employee.</EmptyState> : (
          <Table head={["Month", "Pay date", "Staff", "Gross", "Net pay", "Status"]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50">
                <Td><Link href={`/w/${slug}/payroll/${r.id}`} className="font-medium hover:underline">{r.name}</Link></Td>
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
      <Modal open={creating} title="Run payroll" onClose={() => setCreating(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Month"><Select value={form.month} onChange={(e) => setForm((p) => ({ ...p, month: Number(e.target.value) }))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</Select></Field>
            <Field label="Year"><Select value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: Number(e.target.value) }))}>{[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}</Select></Field>
          </div>
          <p className="text-sm text-stone-600">A payslip is made for every employee on payroll, with their allowances, deductions and any unpaid leave. You can change payslips before approving.</p>
          <FormError error={create.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit" loading={create.isPending}>Create payslips</Button></div>
        </form>
      </Modal>
    </div>
  );
}
