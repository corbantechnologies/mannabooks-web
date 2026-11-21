"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate, todayIso } from "@/lib/format";
import { sourceLink } from "@/lib/source-links";
import { useWorkspace } from "@/lib/workspace";

const DRAFT_PATH = { invoice: "sales/invoices", bill: "purchasing/bills", journal: "accounting/journals" } as const;
const PAYROLL: Record<string, string> = { draft: "Payroll is still a draft", approved: "Payroll approved, not yet paid", paid: "Payroll paid", none: "Payroll not run yet" };

/**
 * One month of the books: its figures, what is still unfinished, every document posted in it, and buttons to record
 * more into it (a bill, an expense, an invoice or a journal dated in the month).
 */
export default function MonthPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const [find, setFind] = useState("");
  const q = useQuery({
    queryKey: ["period-summary", slug, id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/periods/{id}/summary/", { params: { path: { workspace: slug, id } } })),
  });
  if (q.isLoading) return <Spinner />;
  if (q.error) return <ErrorState error={q.error} />;
  const m = q.data!;
  const today = todayIso();
  const date = today >= m.start_date && today <= m.end_date ? today : m.start_date;  // new documents land in this month
  const open = m.status === "open";
  const w = (path: string) => `/w/${slug}/${path}`;
  const todo: { done: boolean; text: string; href?: string }[] = [
    ...m.drafts.map((d) => ({ done: false, text: `${d.label}${d.amount ? `, ${fmt(d.amount)}` : ""} (${fmtDate(d.date)})`, href: w(`${DRAFT_PATH[d.kind]}/${d.id}`) })),
    m.unmatched_lines
      ? { done: false, text: `${m.unmatched_lines} bank statement line${m.unmatched_lines === 1 ? "" : "s"} not matched`, href: w("banking/reconciliations") }
      : { done: true, text: "Bank statement lines matched" },
    ...(m.payroll ? [{ done: m.payroll === "paid", text: PAYROLL[m.payroll] ?? `Payroll: ${m.payroll}`, href: w("payroll") }] : []),
    ...(m.earlier_open.length ? [{ done: false, text: `Earlier months still open: ${m.earlier_open.join(", ")}`, href: w("accounting/years") }] : []),
  ];
  if (!m.drafts.length) todo.unshift({ done: true, text: "No drafts left in this month" });
  const needle = find.trim().toLowerCase();
  const docs = m.documents.filter((d) => !needle || `${d.description} ${d.reference} ${d.number} ${d.source}`.toLowerCase().includes(needle));
  const actions: [string, string, boolean][] = [
    ["Enter bill", `purchasing/bills/new?date=${date}`, can("bills.create")],
    ["Record expense", `banking/expenses/new?date=${date}`, can("banking.spend") || can("expenses.create")],
    ["New invoice", `sales/invoices/new?date=${date}`, can("invoices.create")],
    ["Journal entry", `accounting/journals/new?date=${date}`, can("journals.create")],
  ];

  return (
    <div className="w-full">
      <Link href={w("accounting/years")} className="text-sm text-stone-500 hover:underline">&larr; Financial years</Link>
      <PageHeader title={m.name} guide="financial-years"
        description={<>{fmtDate(m.start_date)} to {fmtDate(m.end_date)}, {m.fiscal_year_name}. <Badge tone={open ? "green" : "stone"}>{open ? "Open" : "Closed"}</Badge></>}
        actions={open && <div className="flex flex-wrap gap-2">{actions.filter((a) => a[2]).map(([label, href], i) => (
          <Link key={label} href={w(href)}><Button variant={i === 0 ? "primary" : "secondary"}>{label}</Button></Link>
        ))}</div>} />
      {!open && <p className="mb-4 rounded-md bg-stone-100 px-3 py-2 text-sm text-stone-700">This month is closed, so nothing can be recorded in it. Reopen it on Financial years to make changes.</p>}
      {open && <p className="-mt-3 mb-4 text-xs text-stone-500">New documents from these buttons are dated {fmtDate(date)}; change the date on the form if needed.</p>}

      <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Income" value={fmt(m.income)} />
        <Stat label="Costs" value={fmt(m.expenses)} />
        <Stat label="Profit" value={fmt(m.profit)} bad={Number(m.profit) < 0} />
        <Stat label="Money in" value={fmt(m.money_in)} />
        <Stat label="Money out" value={fmt(m.money_out)} />
        <Stat label="Entries" value={String(m.entries)} />
      </div>

      <h2 className="mb-2 text-sm font-semibold">Before closing</h2>
      <Card className="mb-6 divide-y divide-stone-100">
        {todo.map((t) => (
          <div key={t.text} className="flex items-center gap-2 px-4 py-2.5 text-sm">
            {t.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <CircleAlert className="h-4 w-4 shrink-0 text-amber-600" />}
            {t.href && !t.done ? <Link href={t.href} className="text-brand-700 hover:underline">{t.text}</Link> : <span className={t.done ? "text-stone-600" : ""}>{t.text}</span>}
          </div>
        ))}
      </Card>

      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-sm font-semibold">Everything recorded in {m.name}</h2>
        <Input className="max-w-xs" placeholder="Find a supplier, number, description" value={find} onChange={(e) => setFind(e.target.value)} />
      </div>
      <Card>
        {docs.length === 0 ? <EmptyState title={m.documents.length ? "Nothing matches" : "Nothing recorded in this month yet"} /> : (
          <Table head={["Date", "Document", "What", "Amount"]}>
            {docs.map((d) => {
              const l = sourceLink(slug, d);
              return (
                <tr key={d.entry_id} className="hover:bg-stone-50">
                  <Td className="whitespace-nowrap text-stone-600">{fmtDate(d.date)}</Td>
                  <Td><Link href={l?.href ?? w(`accounting/journals/${d.entry_id}`)} className="font-medium text-brand-700 hover:underline">{l?.label ?? (d.source === "manual" ? "Journal" : d.source.replace(/_/g, " "))}</Link>
                    <span className="block text-xs text-stone-500">{d.reference || d.number}</span></Td>
                  <Td className="max-w-md truncate">{d.description}</Td>
                  <Td className="text-right font-mono">{fmt(d.amount)}</Td>
                </tr>
              );
            })}
          </Table>
        )}
        {m.documents.length >= m.documents_limit && <p className="px-4 py-2 text-xs text-stone-500">Showing the latest {m.documents_limit}. The journal entries list has them all.</p>}
      </Card>
    </div>
  );
}

function Stat({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <Card className="p-3">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`mt-1 font-mono text-base font-semibold ${bad ? "text-red-700" : "text-stone-900"}`}>{value}</p>
    </Card>
  );
}
