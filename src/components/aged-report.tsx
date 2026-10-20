"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Download, Printer } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";

import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { downloadCsv, fmt, fmtDate, fmtNonZero, todayIso } from "@/lib/format";
import { usePeriod } from "@/lib/period";
import { useWorkspace } from "@/lib/workspace";

const BUCKETS = [["current", "Not yet due"], ["days_1_30", "1-30 days"], ["days_31_60", "31-60 days"], ["days_61_90", "61-90 days"], ["over_90", "Over 90 days"]] as const;

export function AgedReport({ kind }: { kind: "receivables" | "payables" }) {
  const { slug, context } = useWorkspace();
  const { to: periodEnd } = usePeriod();
  const endOf = (end?: string) => (end && end < todayIso() ? end : todayIso());
  const [asOf, setAsOf] = useState(endOf(periodEnd));
  const [periodSeen, setPeriodSeen] = useState(periodEnd);
  if (periodEnd !== periodSeen) { // the header's period changed: show its end
    setPeriodSeen(periodEnd);
    setAsOf(endOf(periodEnd));
  }
  const [open, setOpen] = useState<string | null>(null);
  const report = useQuery({
    queryKey: ["aged", slug, kind, asOf],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/reports/aged/{kind}/", { params: { path: { workspace: slug, kind }, query: { as_of: asOf } } })),
  });
  const d = report.data;
  const who = kind === "receivables" ? "Customer" : "Supplier";
  const docPath = kind === "receivables" ? "sales/invoices" : "purchasing/bills";
  function exportCsv() {
    if (!d) return;
    downloadCsv(`aged-${kind}-${asOf}.csv`, [[who, ...BUCKETS.map((b) => b[1]), "Total"],
      ...d.rows.map((r) => [r.name, ...BUCKETS.map((b) => r[b[0]]), r.total]), ["Total", ...BUCKETS.map((b) => d.totals[b[0]]), d.totals.total]]);
  }
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/accounting/reports`} className="text-sm text-stone-500 hover:underline print:hidden">&larr; Reports</Link>
      <PageHeader title={kind === "receivables" ? "Aged receivables" : "Aged payables"}
        description={kind === "receivables" ? `Who owes you, and for how long past the due date, in ${context.workspace.currency}.` : `What you owe suppliers, and how long it has been due, in ${context.workspace.currency}.`}
        guide="financial-reports"
        actions={<div className="flex gap-2 print:hidden"><Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button><Button variant="secondary" onClick={exportCsv} disabled={!d?.rows.length}><Download className="h-4 w-4" /> CSV</Button></div>} />
      <div className="mb-4 flex items-end gap-3 print:hidden"><Field label="As at"><Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} /></Field></div>
      <Card>
        {report.isLoading ? <div className="px-4"><Spinner /></div> : report.error ? <div className="p-4"><ErrorState error={report.error} /></div> : !d!.rows.length ? (
          <EmptyState title={kind === "receivables" ? "Nobody owes you anything" : "You owe suppliers nothing"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr><th className="px-4 py-2.5 font-medium">{who}</th>{BUCKETS.map((b) => <th key={b[0]} className="px-4 py-2.5 text-right font-medium">{b[1]}</th>)}<th className="px-4 py-2.5 text-right font-medium">Total</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {d!.rows.map((r) => (
                  <Fragment key={r.party_id}>
                    <tr className="cursor-pointer hover:bg-stone-50" onClick={() => setOpen(open === r.party_id ? null : r.party_id)}>
                      <td className="px-4 py-2.5 font-medium">{open === r.party_id ? <ChevronDown className="mr-1 inline h-3.5 w-3.5" /> : <ChevronRight className="mr-1 inline h-3.5 w-3.5" />}{r.name}</td>
                      {BUCKETS.map((b) => <td key={b[0]} className={`px-4 py-2.5 text-right font-mono ${b[0] === "over_90" && Number(r[b[0]]) > 0 ? "text-red-700" : ""}`}>{fmtNonZero(r[b[0]])}</td>)}
                      <td className="px-4 py-2.5 text-right font-mono font-medium">{fmt(r.total)}</td>
                    </tr>
                    {open === r.party_id && r.documents.map((doc) => (
                      <tr key={doc.id} className="bg-stone-50/60 text-xs">
                        <td className="px-4 py-1.5 pl-10"><Link className="font-mono hover:underline" href={`/w/${slug}/${docPath}/${doc.id}`}>{doc.number}</Link> due {fmtDate(doc.due_date)}{doc.days_overdue > 0 && <span className="text-red-700"> ({doc.days_overdue} days late)</span>}</td>
                        <td colSpan={BUCKETS.length} />
                        <td className="px-4 py-1.5 text-right font-mono">{fmt(doc.amount)}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
                <tr className="bg-stone-100 font-semibold"><td className="px-4 py-2.5">Total</td>{BUCKETS.map((b) => <td key={b[0]} className="px-4 py-2.5 text-right font-mono">{fmt(d!.totals[b[0]])}</td>)}<td className="px-4 py-2.5 text-right font-mono">{fmt(d!.totals.total)}</td></tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
