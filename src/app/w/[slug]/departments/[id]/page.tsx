"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { usePeriod } from "@/lib/period";
import { useWorkspace } from "@/lib/workspace";

/** Where each kind of source document opens. Anything else opens its journal entry. */
const SOURCE_PAGE: Record<string, [string, string]> = {
  "invoices.Invoice": ["sales/invoices", "Invoice"],
  "receipts.Receipt": ["sales/cash-sales", "Cash sale"],
  "creditnotes.CreditNote": ["sales/credit-notes", "Credit note"],
  "payments.Payment": ["sales/payments", "Payment"],
  "bills.Bill": ["purchasing/bills", "Bill"],
  "supplierpayments.SupplierPayment": ["purchasing/payments", "Supplier payment"],
  "paymentvouchers.PaymentVoucher": ["purchasing/vouchers", "Payment voucher"],
  "expenses.Expense": ["banking/expenses", "Expense"],
  "otherincomes.OtherIncome": ["banking/income", "Other income"],
  "payruns.PayRun": ["payroll", "Payroll"],
  "stockadjustments.StockAdjustment": ["inventory/adjustments", "Stock adjustment"],
  "stocktakes.StockTake": ["inventory/stock-takes", "Stock take"],
};

type Doc = { entry_id: string; date: string; number: string; description: string; reference: string; source: string; source_model: string; source_id: string; kind: string; amount: string };

function docLink(slug: string, d: Doc): { href: string; label: string } {
  const key = d.source_model.split(".").slice(0, 2).join(".");
  const page = SOURCE_PAGE[key];
  if (page && d.source_id) return { href: `/w/${slug}/${page[0]}/${d.source_id}`, label: page[1] };
  return { href: `/w/${slug}/accounting/journals/${d.entry_id}`, label: d.source === "manual" ? "Journal" : d.source.replace(/_/g, " ") };
}

/**
 * One department, for everyone who can see departments: who heads it, its people and what it runs. People who can see
 * reports also get the money: what it spent against its budget, pay by person, and every document tagged to it.
 */
export default function DepartmentPage() {
  const { slug, can, context } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const { from, to, label } = usePeriod();
  const [tab, setTab] = useState<"documents" | "spending" | "pay">("documents");
  const money = can("reports.view") && !context.limited_department;
  const dept = useQuery({
    queryKey: ["department", slug, id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/departments/{id}/", { params: { path: { workspace: slug, id } } })),
  });
  const people = useQuery({
    queryKey: ["employees", slug, "department", id], enabled: can("employees.view"),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/employees/", { params: { path: { workspace: slug }, query: { department: id, page_size: 200 } as never } })),
  });
  const detail = useQuery({
    queryKey: ["dashboard-department", slug, id, from, to], enabled: money,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/dashboard/departments/{id}/", { params: { path: { workspace: slug, id }, query: { from, to } } })),
  });
  const catalog = useQuery({
    queryKey: ["permission-catalog", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/roles/permissions/", { params: { path: { workspace: slug } } })),
  });
  const moduleLabels = (catalog.data?.department_modules ?? {}) as Record<string, string>;
  if (dept.isLoading) return <Spinner />;
  if (dept.error) return <ErrorState error={dept.error} />;
  const d = dept.data!;
  const members = (people.data?.results ?? []) as { id: string; first_name: string; last_name?: string; job_title?: string; status?: string }[];
  const headIsMember = members.some((m) => m.id === d.head_id);
  const v = detail.data;
  const spent = (v?.spending ?? []).reduce((s, r) => s + Number(r.spent), 0);
  const budget = (v?.spending ?? []).reduce((s, r) => s + Number(r.budget), 0);
  const earned = (v?.documents ?? []).filter((x) => x.kind === "earned").reduce((s, x) => s + Number(x.amount), 0);
  const modules = (d.modules as string[] | undefined) ?? [];

  return (
    <div className="w-full">
      <Link href={`/w/${slug}/${money ? "all-departments" : "departments"}`} className="text-sm text-stone-500 hover:underline">&larr; {money ? "All departments" : "Departments"}</Link>
      <PageHeader title={d.name} guide="departments"
        description={[d.code, d.description].filter(Boolean).join(" · ") || "A department of the business."}
        actions={can("departments.manage") && <Link href={`/w/${slug}/departments?edit=${d.id}`}><Button variant="secondary">Edit</Button></Link>} />
      {!d.is_active && <p className="mb-3"><Badge>Inactive</Badge></p>}

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-stone-500">Head (in-charge)</p>
          <p className="mt-1 text-lg font-semibold text-stone-900">{d.head_name ?? <span className="text-stone-400">No head yet</span>}</p>
          {d.head_name && !headIsMember && <p className="mt-1 text-xs text-stone-500">Heads this department while being employed in another. They still see it on My department.</p>}
          <p className="mt-3 text-xs uppercase tracking-wide text-stone-500">Runs</p>
          <div className="mt-1 flex flex-wrap gap-1">{modules.length ? modules.map((m) => <Badge key={m} tone="blue">{moduleLabels[m] ?? m}</Badge>) : <span className="text-sm text-stone-500">No modules: a division or business unit.</span>}</div>
        </Card>
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between"><p className="text-xs uppercase tracking-wide text-stone-500">People</p><span className="text-xs text-stone-500">{members.length + (d.head_name && !headIsMember ? 1 : 0)}</span></div>
          {!can("employees.view") ? <p className="mt-2 text-sm text-stone-500">{d.employee_count ?? 0} employee{d.employee_count === 1 ? "" : "s"}.</p> : (
            <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {d.head_name && !headIsMember && d.head_id && (
                <li className="flex items-center justify-between text-sm"><Link href={`/w/${slug}/employees/${d.head_id}`} className="hover:underline">{d.head_name}</Link><Badge tone="green">Head</Badge></li>
              )}
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate"><Link href={`/w/${slug}/employees/${m.id}`} className="hover:underline">{m.first_name} {m.last_name}</Link>{m.job_title && <span className="text-stone-500"> · {m.job_title}</span>}</span>
                  {m.id === d.head_id ? <Badge tone="green">Head</Badge> : m.status && m.status !== "active" ? <Badge>{m.status}</Badge> : null}
                </li>
              ))}
              {!members.length && !d.head_name && <li className="text-sm text-stone-500">Nobody yet. Set the department on an employee&apos;s record.</li>}
            </ul>
          )}
        </Card>
      </div>

      {money && (
        <>
          <div className="mb-3 grid gap-3 sm:grid-cols-4">
            <Stat label={`Spent, ${label}`} value={fmt(spent)} />
            <Stat label="Budget" value={budget ? fmt(budget) : "No budget"} />
            <Stat label="Left" value={budget ? fmt(budget - spent) : "-"} bad={budget > 0 && spent > budget} />
            <Stat label="Earned" value={fmt(earned)} />
          </div>
          <div className="mb-3 flex gap-1 rounded-md border border-stone-200 p-0.5 sm:w-fit">
            {([["documents", "Documents"], ["spending", "What it spent on"], ["pay", "Pay"]] as const).filter(([k]) => k !== "pay" || v?.wages_shown).map(([k, t]) => (
              <button key={k} onClick={() => setTab(k)} className={clsx("rounded px-3 py-1.5 text-sm", tab === k ? "bg-brand-700 text-white" : "text-stone-600 hover:bg-stone-100")}>{t}</button>
            ))}
          </div>
          <Card>
            {detail.isLoading ? <div className="px-4"><Spinner /></div> : detail.error ? <div className="p-4"><ErrorState error={detail.error} /></div> : !v ? null
              : tab === "documents" ? (v.documents.length === 0 ? <EmptyState title={`Nothing tagged to ${d.name} in ${label}`}>Documents count here when a line is tagged with the department or one of its cost centres.</EmptyState> : (
                <>
                  <Table head={["Date", "Document", "What", "Spent", "Earned"]}>
                    {v.documents.map((x) => {
                      const l = docLink(slug, x);
                      return (
                        <tr key={x.entry_id} className="hover:bg-stone-50">
                          <Td className="whitespace-nowrap text-stone-600">{fmtDate(x.date)}</Td>
                          <Td><Link href={l.href} className="font-medium hover:underline">{l.label}</Link><span className="block text-xs text-stone-500">{x.reference || x.number}</span></Td>
                          <Td className="max-w-md truncate">{x.description}</Td>
                          <Td className="text-right font-mono">{x.kind === "spent" ? fmt(x.amount) : ""}</Td>
                          <Td className="text-right font-mono text-emerald-700">{x.kind === "earned" ? fmt(x.amount) : ""}</Td>
                        </tr>
                      );
                    })}
                  </Table>
                  {v.documents.length >= v.documents_limit && <p className="px-4 py-2 text-xs text-stone-500">Showing the latest {v.documents_limit}. Pick a shorter period at the top to see the rest.</p>}
                </>
              ))
              : tab === "spending" ? (v.spending.length === 0 ? <EmptyState title="Nothing spent in this period" /> : (
                <Table head={["Account", "Spent", "Share", "Budget", "Left"]}>
                  {v.spending.map((r) => {
                    const share = spent > 0 ? Math.round((Number(r.spent) / spent) * 100) : 0;
                    const left = Number(r.budget) ? Number(r.budget) - Number(r.spent) : null;
                    return (
                      <tr key={r.account_id}>
                        <Td>{r.account}</Td>
                        <Td className="text-right font-mono">{fmt(r.spent)}</Td>
                        <Td className="w-40"><div className="flex items-center gap-2"><div className="h-2 flex-1 rounded bg-stone-100"><div className="h-2 rounded bg-brand-600" style={{ width: `${share}%` }} /></div><span className="text-xs text-stone-600">{share}%</span></div></Td>
                        <Td className="text-right font-mono">{Number(r.budget) ? fmt(r.budget) : "-"}</Td>
                        <Td className={clsx("text-right font-mono", left !== null && left < 0 && "text-red-600")}>{left === null ? "-" : fmt(left)}</Td>
                      </tr>
                    );
                  })}
                </Table>
              ))
              : (v.people.length === 0 ? <EmptyState title="No approved payslips in this period" /> : (
                <Table head={["Person", "Payslips", "Gross", "Net pay"]}>
                  {v.people.map((p) => (
                    <tr key={p.employee_id}>
                      <Td><Link className="font-medium hover:underline" href={`/w/${slug}/employees/${p.employee_id}`}>{p.name}</Link>{p.job_title && <span className="block text-xs text-stone-500">{p.job_title}</span>}</Td>
                      <Td className="text-right">{p.payslips}</Td>
                      <Td className="text-right font-mono">{fmt(p.gross)}</Td>
                      <Td className="text-right font-mono">{fmt(p.net)}</Td>
                    </tr>
                  ))}
                </Table>
              ))}
          </Card>
          <p className="mt-2 text-xs text-stone-500">For {label}; change the year or month at the top. Pay is by each person&apos;s department on their employee record.</p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className={clsx("mt-1 font-mono text-lg font-semibold", bad ? "text-red-700" : "text-stone-900")}>{value}</p>
    </Card>
  );
}
