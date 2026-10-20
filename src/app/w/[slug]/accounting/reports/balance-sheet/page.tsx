"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { type StatementItem, StatementTable, sectionCsv } from "@/components/statement";
import { Badge, Button, Card, ErrorState, Field, Input, PageHeader, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { downloadCsv, fmtDate, todayIso } from "@/lib/format";
import { usePeriod } from "@/lib/period";
import { useWorkspace } from "@/lib/workspace";

export default function BalanceSheetPage() {
  const { slug, context } = useWorkspace();
  const { to: periodEnd } = usePeriod();
  const endOf = (end?: string) => (end && end < todayIso() ? end : todayIso());
  const [asOf, setAsOf] = useState(endOf(periodEnd));
  const [periodSeen, setPeriodSeen] = useState(periodEnd);
  if (periodEnd !== periodSeen) { // the header's period changed: show its end
    setPeriodSeen(periodEnd);
    setAsOf(endOf(periodEnd));
  }
  const [compareAsOf, setCompareAsOf] = useState("");
  const bs = useQuery({
    queryKey: ["balance-sheet", slug, asOf, compareAsOf],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/reports/balance-sheet/", {
      params: { path: { workspace: slug }, query: { as_of: asOf, compare_as_of: compareAsOf || undefined } },
    })),
  });
  const d = bs.data;
  const compare = Boolean(compareAsOf);
  const g = (k: string) => d!.groups.find((x) => x.key === k)!;
  const items: StatementItem[] = d ? [
    { kind: "section", section: g("current_assets") }, { kind: "section", section: g("fixed_assets") },
    { kind: "total", label: "Total assets", amount: d.total_assets, compare: d.compare_total_assets, strong: true },
    { kind: "section", section: g("current_liabilities") }, { kind: "section", section: g("long_term_liabilities") },
    { kind: "total", label: "Total liabilities", amount: d.total_liabilities, compare: d.compare_total_liabilities },
    { kind: "section", section: g("equity") },
    { kind: "total", label: "Total liabilities and equity", amount: Number(d.total_liabilities) + Number(d.total_equity),
      compare: Number(d.compare_total_liabilities) + Number(d.compare_total_equity), strong: true },
  ] : [];
  return (
    <div className="max-w-4xl">
      <Link href={`/w/${slug}/accounting/reports`} className="text-sm text-stone-500 hover:underline print:hidden">&larr; Reports</Link>
      <PageHeader title="Balance sheet" guide="financial-reports" description={`As at ${fmtDate(asOf)}, in ${context.workspace.currency}.`}
        actions={<div className="flex gap-2 print:hidden">
          <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
          <Button variant="secondary" disabled={!d} onClick={() => downloadCsv(`balance-sheet-${asOf}.csv`, [["Code", "Account", "Amount", ...(compare ? ["Compare"] : [])], ...sectionCsv(items, compare)])}><Download className="h-4 w-4" /> CSV</Button>
        </div>} />
      <div className="mb-4 flex flex-wrap items-end gap-3 print:hidden">
        <Field label="As at"><Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} /></Field>
        <Field label="Compare with (optional)"><Input type="date" value={compareAsOf} onChange={(e) => setCompareAsOf(e.target.value)} /></Field>
        {d && (d.balanced ? <Badge tone="green">Balances</Badge> : <Badge tone="red">Does not balance</Badge>)}
      </div>
      <Card>
        {bs.isLoading ? <div className="px-4"><Spinner /></div> : bs.error ? <div className="p-4"><ErrorState error={bs.error} /></div> : (
          <StatementTable items={items} compare={compare} currentLabel={fmtDate(d!.as_of)} compareLabel={compareAsOf ? fmtDate(compareAsOf) : ""} />
        )}
      </Card>
    </div>
  );
}
