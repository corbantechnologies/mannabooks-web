"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Download, Printer } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";

import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Select, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { datePresets } from "@/lib/api/control";
import { downloadCsv, fmt, fmtDate } from "@/lib/format";
import { usePeriod } from "@/lib/period";
import { useWorkspace } from "@/lib/workspace";

const DIMENSIONS = [["department", "Department"], ["cost_center", "Cost centre"], ["branch", "Branch"], ["project", "Project"]] as const;
type Dimension = (typeof DIMENSIONS)[number][0];

/** Profit and loss with a column per department (or cost centre, branch or project), lines not tagged, and the total. */
export default function ProfitAndLossByDepartmentPage() {
  const { slug, context } = useWorkspace();
  const presets = datePresets();
  const period = usePeriod();
  const [preset, setPreset] = useState(period.from ? "custom" : "this_year");
  const [range, setRange] = useState(period.from && period.to ? { from: period.from, to: period.to } : { from: presets[4].from, to: presets[4].to });
  const [periodSeen, setPeriodSeen] = useState(`${period.from}|${period.to}`);
  if (`${period.from}|${period.to}` !== periodSeen) { // the header's period changed: follow it
    setPeriodSeen(`${period.from}|${period.to}`);
    if (period.from && period.to) { setRange({ from: period.from, to: period.to }); setPreset("custom"); }
  }
  const [dimension, setDimension] = useState<Dimension>("department");
  const report = useQuery({
    queryKey: ["profit-and-loss-by", slug, range, dimension],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/reports/profit-and-loss/by/", {
      params: { path: { workspace: slug }, query: { from: range.from, to: range.to, dimension } },
    })),
  });
  const d = report.data;
  const heads = d ? [...d.columns.map((c) => c.name), "Total"] : [];
  const limit = context.limited_department;

  function csv() {
    if (!d) return;
    const rows: (string | number)[][] = [["Code", "Account", ...heads]];
    const total = (label: string, values: string[]) => rows.push(["", label, ...values]);
    d.sections.forEach((s, i) => {
      rows.push(["", s.label]);
      s.rows.forEach((r) => rows.push([r.code, r.name, ...r.amounts, r.total]));
      total(`Total ${s.label.toLowerCase()}`, [...s.totals, s.total]);
      if (i === 1) total("Gross profit", d.gross_profit);
      if (i === 2) total("Operating profit", d.operating_profit);
    });
    total("Net profit", d.net_profit);
    downloadCsv(`profit-and-loss-by-${dimension}-${range.from}-${range.to}.csv`, rows);
  }

  const money = (v: string) => <td className={clsx("whitespace-nowrap px-3 py-1.5 text-right font-mono", Number(v) < 0 && "text-red-700")}>{fmt(v)}</td>;
  const totalRow = (label: string, values: string[], strong = false) => (
    <tr className={clsx("border-t border-stone-200", strong ? "bg-brand-50 font-semibold" : "bg-stone-50 font-medium")}>
      <td className="sticky left-0 z-10 bg-inherit px-3 py-2">{label}</td>{values.map((v, i) => <td key={i} className={clsx("whitespace-nowrap px-3 py-2 text-right font-mono", Number(v) < 0 && "text-red-700")}>{fmt(v)}</td>)}
    </tr>
  );

  return (
    <div className="w-full">
      <Link href={`/w/${slug}/accounting/reports`} className="text-sm text-stone-500 hover:underline print:hidden">&larr; Reports</Link>
      <PageHeader title={`Profit and loss by ${DIMENSIONS.find(([k]) => k === dimension)![1].toLowerCase()}`} guide="financial-reports"
        description={`${fmtDate(range.from)} to ${fmtDate(range.to)}, in ${context.workspace.currency}.${limit ? ` Limited to ${limit.name}.` : ""} A line without its own department takes its cost centre's.`}
        actions={<div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
          <Button variant="secondary" disabled={!d} onClick={csv}><Download className="h-4 w-4" /> CSV</Button>
        </div>} />
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <Field label="Columns"><Select value={dimension} onChange={(e) => setDimension(e.target.value as Dimension)}>{DIMENSIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
        <Field label="Period"><Select value={preset} onChange={(e) => { setPreset(e.target.value); const p = presets.find((x) => x.key === e.target.value); if (p) setRange({ from: p.from, to: p.to }); }}>
          {presets.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}<option value="custom">Custom</option></Select></Field>
        <Field label="From"><Input type="date" value={range.from} onChange={(e) => { setPreset("custom"); setRange((r) => ({ ...r, from: e.target.value })); }} /></Field>
        <Field label="To"><Input type="date" value={range.to} onChange={(e) => { setPreset("custom"); setRange((r) => ({ ...r, to: e.target.value })); }} /></Field>
      </Card>
      <Card className="overflow-x-auto">
        {report.isLoading ? <div className="px-4"><Spinner /></div> : report.error ? <div className="p-4"><ErrorState error={report.error} /></div> : !d!.columns.length ? (
          <EmptyState title="Nothing posted in this period">Income and costs appear here once they are recorded. Tag documents with a department or cost centre to split them.</EmptyState>
        ) : (
          <table className="w-full min-w-max text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="sticky left-0 z-10 bg-stone-50 px-3 py-2 text-left font-medium">Account</th>
                {heads.map((h, i) => <th key={i} className={clsx("px-3 py-2 text-right font-medium", i === heads.length - 1 && "text-stone-700")}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {d!.sections.map((s, i) => (
                <SectionRows key={s.key} section={s} money={money} after={i === 1 ? totalRow("Gross profit", d!.gross_profit) : i === 2 ? totalRow("Operating profit", d!.operating_profit) : null} totalRow={totalRow} />
              ))}
              {totalRow("Net profit", d!.net_profit, true)}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

type Section = { key: string; label: string; rows: { account_id: string; code: string; name: string; amounts: string[]; total: string }[]; totals: string[]; total: string };

function SectionRows({ section, money, after, totalRow }: { section: Section; money: (v: string) => React.ReactNode; after: React.ReactNode;
  totalRow: (label: string, values: string[], strong?: boolean) => React.ReactNode }) {
  if (!section.rows.length && !after) return null;
  return (
    <>
      {section.rows.length > 0 && <>
        <tr><td colSpan={section.totals.length + 2} className="sticky left-0 bg-white px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-stone-500">{section.label}</td></tr>
        {section.rows.map((r) => (
          <tr key={r.account_id} className="hover:bg-stone-50">
            <td className="sticky left-0 z-10 bg-white px-3 py-1.5"><span className="mr-2 font-mono text-xs text-stone-400">{r.code}</span>{r.name}</td>
            {r.amounts.map((v, i) => <Fragment key={i}>{money(v)}</Fragment>)}{money(r.total)}
          </tr>
        ))}
        {totalRow(`Total ${section.label.toLowerCase()}`, [...section.totals, section.total])}
      </>}
      {after}
    </>
  );
}
