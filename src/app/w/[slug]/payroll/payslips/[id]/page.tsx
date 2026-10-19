"use client";

import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { useParams } from "next/navigation";

import { Button, ErrorState, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import type { PayItem } from "@/lib/api/people";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

function Row({ label, value, strong, minus }: { label: string; value?: string | number; strong?: boolean; minus?: boolean }) {
  return <div className={`flex justify-between gap-4 py-1 ${strong ? "font-semibold" : ""}`}><span>{label}</span><span className="font-mono">{minus ? "-" : ""}{fmt(value)}</span></div>;
}

/** A payslip, laid out for phones and for printing. */
export default function PayslipPage() {
  const { slug, context } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const slip = useQuery({ queryKey: ["payslip", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/payslips/{id}/", { params: { path: { workspace: slug, id } } })) });
  if (slip.isLoading) return <Spinner />;
  if (slip.error) return <ErrorState error={slip.error} />;
  const s = slip.data!;
  const items = (s.items ?? []) as PayItem[];
  const ws = context.workspace;
  return (
    <div className="mx-auto max-w-md print:max-w-none">
      <div className="mb-3 flex justify-end gap-2 print:hidden">
        <Button variant="secondary" onClick={() => history.back()}>Back</Button>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Print or save PDF</Button>
      </div>
      <article className="rounded-lg border border-stone-200 bg-white p-5 text-sm shadow-sm print:border-0 print:shadow-none">
        <header className="border-b border-stone-200 pb-3">
          <p className="font-bold">{ws.legal_name || ws.name}</p>
          <p className="text-lg font-semibold">Payslip · {s.period}</p>
          <p className="text-stone-600">{s.employee_name} · {s.staff_number}{s.job_title ? ` · ${s.job_title}` : ""}</p>
          <p className="text-xs text-stone-500">KRA PIN {s.kra_pin || "-"} · NSSF {s.nssf_number || "-"} · SHIF {s.shif_number || "-"} · paid {fmtDate(s.pay_date)}</p>
        </header>
        <section className="mt-3">
          <p className="text-xs uppercase tracking-wide text-stone-500">Earnings</p>
          <Row label="Basic salary" value={s.basic_salary} />
          {Number(s.unpaid_leave_deduction) > 0 && <Row label={`Unpaid leave (${Number(s.unpaid_leave_days)} days)`} value={s.unpaid_leave_deduction} minus />}
          {items.filter((i) => i.kind === "earning").map((i, n) => <Row key={n} label={`${i.name}${i.taxable === false ? " (tax-free)" : ""}`} value={i.amount} />)}
          <Row label="Gross pay" value={s.gross_pay} strong />
        </section>
        <section className="mt-3">
          <p className="text-xs uppercase tracking-wide text-stone-500">Deductions</p>
          <Row label="PAYE" value={s.paye} />
          <Row label="SHIF" value={s.shif} />
          <Row label="NSSF" value={s.nssf_employee} />
          <Row label="Housing Levy" value={s.housing_levy_employee} />
          {items.filter((i) => i.kind === "deduction").map((i, n) => <Row key={n} label={i.name} value={i.amount} />)}
        </section>
        <div className="mt-3 flex justify-between rounded-md bg-brand-50 px-3 py-2 text-base font-semibold"><span>Net pay</span><span className="font-mono">{fmt(s.net_pay)}</span></div>
        <p className="mt-2 text-xs text-stone-500">Paid to {s.pay_to || s.pay_method}</p>
        <details className="mt-3 text-xs text-stone-600">
          <summary className="cursor-pointer">How the tax was worked out</summary>
          <Row label="Taxable pay" value={s.taxable_pay} />
          <Row label="Tax before relief" value={s.paye_before_relief} />
          <Row label="Personal relief" value={s.personal_relief} minus />
          <Row label="Employer NSSF" value={s.nssf_employer} />
          <Row label="Employer Housing Levy" value={s.housing_levy_employer} />
        </details>
      </article>
    </div>
  );
}
