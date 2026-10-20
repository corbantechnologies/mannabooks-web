"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { type StatementItem, StatementTable, sectionCsv } from "@/components/statement";
import { Card, ErrorState, Field, Input, PageHeader, Select, Spinner, Button } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { datePresets, useCostCenters, useProjects } from "@/lib/api/control";
import { downloadCsv, fmtDate } from "@/lib/format";
import { usePeriod } from "@/lib/period";
import { useWorkspace } from "@/lib/workspace";

export default function ProfitAndLossPage() {
  const { slug, context } = useWorkspace();
  const presets = datePresets();
  const [preset, setPreset] = useState(usePeriod().from ? "custom" : "this_year");
  const period = usePeriod();
  const [range, setRange] = useState(period.from && period.to ? { from: period.from, to: period.to } : { from: presets[4].from, to: presets[4].to });
  const [periodSeen, setPeriodSeen] = useState(`${period.from}|${period.to}`);
  if (`${period.from}|${period.to}` !== periodSeen) { // the header's period changed: follow it
    setPeriodSeen(`${period.from}|${period.to}`);
    if (period.from && period.to) { setRange({ from: period.from, to: period.to }); setPreset("custom"); }
  }
  const [compare, setCompare] = useState<"none" | "previous_period" | "previous_year">("previous_year");
  const [dims, setDims] = useState({ cost_center: "", project: "", branch: "" });
  const centres = useCostCenters(slug);
  const projects = useProjects(slug);
  const branches = useQuery({ queryKey: ["branches", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/branches/", { params: { path: { workspace: slug } } })) });
  const pl = useQuery({
    queryKey: ["profit-and-loss", slug, range, compare, dims],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/reports/profit-and-loss/", {
      params: { path: { workspace: slug }, query: { from: range.from, to: range.to, compare, cost_center: dims.cost_center || undefined, project: dims.project || undefined, branch: dims.branch || undefined } },
    })),
  });
  const d = pl.data;
  const showCompare = compare !== "none";
  const items: StatementItem[] = d ? [
    { kind: "section", section: d.sections[0] }, { kind: "section", section: d.sections[1] },
    { kind: "total", label: "Gross profit", amount: d.gross_profit, compare: d.compare_gross_profit },
    { kind: "section", section: d.sections[2] },
    { kind: "total", label: "Operating profit", amount: d.operating_profit, compare: d.compare_operating_profit },
    { kind: "section", section: d.sections[3] }, { kind: "section", section: d.sections[4] },
    { kind: "total", label: "Net profit", amount: d.net_profit, compare: d.compare_net_profit, strong: true },
  ] : [];
  const scope = [centres.data?.find((c) => c.id === dims.cost_center)?.name, projects.data?.results.find((p) => p.id === dims.project)?.name,
    (branches.data?.results ?? []).find((b) => b.id === dims.branch)?.name].filter(Boolean).join(", ");
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/accounting/reports`} className="text-sm text-stone-500 hover:underline print:hidden">&larr; Reports</Link>
      <PageHeader title="Profit and loss" guide="financial-reports"
        description={`${fmtDate(range.from)} to ${fmtDate(range.to)}${scope ? `, ${scope}` : ""}, in ${context.workspace.currency}.`}
        actions={<div className="flex gap-2 print:hidden">
          <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
          <Button variant="secondary" disabled={!d} onClick={() => downloadCsv(`profit-and-loss-${range.from}-${range.to}.csv`, [["Code", "Account", "Amount", ...(showCompare ? ["Compare"] : [])], ...sectionCsv(items, showCompare)])}><Download className="h-4 w-4" /> CSV</Button>
        </div>} />
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6 print:hidden">
        <Field label="Period"><Select value={preset} onChange={(e) => { setPreset(e.target.value); const p = presets.find((x) => x.key === e.target.value); if (p) setRange({ from: p.from, to: p.to }); }}>
          {presets.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}<option value="custom">Custom</option></Select></Field>
        <Field label="From"><Input type="date" value={range.from} onChange={(e) => { setPreset("custom"); setRange((r) => ({ ...r, from: e.target.value })); }} /></Field>
        <Field label="To"><Input type="date" value={range.to} onChange={(e) => { setPreset("custom"); setRange((r) => ({ ...r, to: e.target.value })); }} /></Field>
        <Field label="Compare with"><Select value={compare} onChange={(e) => setCompare(e.target.value as never)}><option value="none">Nothing</option><option value="previous_period">Previous period</option><option value="previous_year">Same period last year</option></Select></Field>
        {(centres.data ?? []).length > 0 && <Field label="Cost centre"><Select value={dims.cost_center} onChange={(e) => setDims((x) => ({ ...x, cost_center: e.target.value }))}><option value="">All</option>{centres.data!.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>}
        {(projects.data?.results ?? []).length > 0 && <Field label="Project"><Select value={dims.project} onChange={(e) => setDims((x) => ({ ...x, project: e.target.value }))}><option value="">All</option>{projects.data!.results.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>}
        {(branches.data?.results ?? []).length > 1 && <Field label="Branch"><Select value={dims.branch} onChange={(e) => setDims((x) => ({ ...x, branch: e.target.value }))}><option value="">All</option>{branches.data!.results.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>}
      </Card>
      <Card>
        {pl.isLoading ? <div className="px-4"><Spinner /></div> : pl.error ? <div className="p-4"><ErrorState error={pl.error} /></div> : (
          <StatementTable items={items} compare={showCompare} currentLabel={`${fmtDate(d!.from_date)} - ${fmtDate(d!.to_date)}`}
            compareLabel={d!.compare_from ? `${fmtDate(d!.compare_from)} - ${fmtDate(d!.compare_to)}` : ""} />
        )}
      </Card>
    </div>
  );
}
