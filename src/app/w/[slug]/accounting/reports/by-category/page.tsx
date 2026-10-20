"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { datePresets } from "@/lib/api/control";
import { downloadCsv, fmt, fmtDate } from "@/lib/format";
import { usePeriod } from "@/lib/period";
import { useWorkspace } from "@/lib/workspace";

export default function ByCategoryPage() {
  const { slug, context } = useWorkspace();
  const presets = datePresets();
  const period = usePeriod();
  const [preset, setPreset] = useState(period.from ? "custom" : presets[0].key);
  const [range, setRange] = useState(period.from && period.to ? { from: period.from, to: period.to } : { from: presets[0].from, to: presets[0].to });
  const [periodSeen, setPeriodSeen] = useState(`${period.from}|${period.to}`);
  if (`${period.from}|${period.to}` !== periodSeen) { // the header's period changed: follow it
    setPeriodSeen(`${period.from}|${period.to}`);
    if (period.from && period.to) { setRange({ from: period.from, to: period.to }); setPreset("custom"); }
  }
  const report = useQuery({
    queryKey: ["report-by-category", slug, range],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/reports/by-category/", { params: { path: { workspace: slug }, query: { from: range.from, to: range.to } } })),
  });
  const d = report.data;
  const top = Math.max(...(d?.rows ?? []).map((r) => Number(r.sales)), 1);
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/accounting/reports`} className="text-sm text-stone-500 hover:underline print:hidden">&larr; Reports</Link>
      <PageHeader title="Sales and stock by category" guide="catalogue"
        description={`Sales from ${fmtDate(range.from)} to ${fmtDate(range.to)} before VAT (less credit notes), and the value of the stock you hold now, in ${context.workspace.currency}.`}
        actions={<div className="flex gap-2 print:hidden">
          <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
          <Button variant="secondary" disabled={!d} onClick={() => downloadCsv(`by-category-${range.from}-${range.to}.csv`, [["Category", "Products", "Sales", "Share %", "Stock value"],
            ...d!.rows.map((r) => [r.name, String(r.products), r.sales, r.share, r.stock_value]), ["Total", "", d!.total_sales, "100", d!.total_stock_value]])}>
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>} />
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-3 print:hidden">
        <Field label="Period"><Select value={preset} onChange={(e) => { setPreset(e.target.value); const p = presets.find((x) => x.key === e.target.value); if (p) setRange({ from: p.from, to: p.to }); }}>
          {presets.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}<option value="custom">Custom</option></Select></Field>
        <Field label="From"><Input type="date" value={range.from} onChange={(e) => { setPreset("custom"); setRange((r) => ({ ...r, from: e.target.value })); }} /></Field>
        <Field label="To"><Input type="date" value={range.to} onChange={(e) => { setPreset("custom"); setRange((r) => ({ ...r, to: e.target.value })); }} /></Field>
      </Card>
      {report.isLoading ? <Spinner /> : report.error ? <ErrorState error={report.error} /> : d && (
        <Card>
          {d.rows.length === 0 ? <EmptyState title="No products yet" /> : (
            <Table head={["Category", "Products", "Sales", "Share of sales", "Stock value"]}>
              {d.rows.map((r) => (
                <tr key={r.category_id ?? "none"}>
                  <Td className="font-medium">{r.name}</Td>
                  <Td className="text-right">{r.products}</Td>
                  <Td className="text-right font-mono">{fmt(r.sales)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-28 rounded bg-stone-100"><div className="h-2 rounded bg-brand-600" style={{ width: `${Math.max(Number(r.sales) / top * 100, 0)}%` }} /></div>
                      <span className="font-mono text-xs text-stone-600">{Number(r.share)}%</span>
                    </div>
                  </Td>
                  <Td className="text-right font-mono">{fmt(r.stock_value)}</Td>
                </tr>
              ))}
              <tr className="bg-stone-50 font-semibold"><Td>Total</Td><Td /><Td className="text-right font-mono">{fmt(d.total_sales)}</Td><Td /><Td className="text-right font-mono">{fmt(d.total_stock_value)}</Td></tr>
            </Table>
          )}
        </Card>
      )}
      <p className="mt-3 text-xs text-stone-500">Products made when sold count their sales in their own category; their ingredients&apos; stock counts in the ingredients&apos; categories.</p>
    </div>
  );
}
