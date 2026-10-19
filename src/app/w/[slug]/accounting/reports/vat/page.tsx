"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { datePresets } from "@/lib/api/control";
import { downloadCsv, fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

type Row = { tax_rate: string; rate: string; net: string; tax: string };

function RateTable({ title, rows, total }: { title: string; rows: Row[]; total: string }) {
  return (
    <Card>
      <h2 className="border-b border-stone-200 px-4 py-2.5 text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? <EmptyState title="None in this period" /> : (
        <Table head={["VAT rate", "Value before VAT", "VAT"]}>
          {rows.map((r) => <tr key={r.tax_rate}><Td>{r.tax_rate}</Td><Td className="text-right font-mono">{fmt(r.net)}</Td><Td className="text-right font-mono">{fmt(r.tax)}</Td></tr>)}
          <tr className="bg-stone-50 font-semibold"><Td>Total</Td><Td className="text-right font-mono">{fmt(rows.reduce((a, r) => a + Number(r.net), 0))}</Td><Td className="text-right font-mono">{fmt(total)}</Td></tr>
        </Table>
      )}
    </Card>
  );
}

export default function VatPage() {
  const { slug, context } = useWorkspace();
  const presets = datePresets();
  const [preset, setPreset] = useState("last_month");
  const [range, setRange] = useState({ from: presets[1].from, to: presets[1].to });
  const vat = useQuery({
    queryKey: ["vat-summary", slug, range],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/reports/vat/", { params: { path: { workspace: slug }, query: { from: range.from, to: range.to } } })),
  });
  const d = vat.data;
  const net = Number(d?.net_vat ?? 0);
  return (
    <div className="max-w-4xl">
      <Link href={`/w/${slug}/accounting/reports`} className="text-sm text-stone-500 hover:underline print:hidden">&larr; Reports</Link>
      <PageHeader title="VAT summary" guide="financial-reports"
        description={`${fmtDate(range.from)} to ${fmtDate(range.to)}, in ${context.workspace.currency}. The figures for your VAT return (VAT3) on iTax, due by the 20th of the next month.`}
        actions={<div className="flex gap-2 print:hidden">
          <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
          <Button variant="secondary" disabled={!d} onClick={() => downloadCsv(`vat-${range.from}-${range.to}.csv`, [["Book", "VAT rate", "Net", "VAT"],
            ...d!.sales.map((r) => ["Sales", r.tax_rate, r.net, r.tax]), ...d!.purchases.map((r) => ["Purchases", r.tax_rate, r.net, r.tax]),
            ["", "Output VAT", "", d!.output_vat], ["", "Input VAT", "", d!.input_vat], ["", "VAT payable", "", d!.net_vat]])}><Download className="h-4 w-4" /> CSV</Button>
        </div>} />
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-3 print:hidden">
        <Field label="Period"><Select value={preset} onChange={(e) => { setPreset(e.target.value); const p = presets.find((x) => x.key === e.target.value); if (p) setRange({ from: p.from, to: p.to }); }}>
          {presets.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}<option value="custom">Custom</option></Select></Field>
        <Field label="From"><Input type="date" value={range.from} onChange={(e) => { setPreset("custom"); setRange((r) => ({ ...r, from: e.target.value })); }} /></Field>
        <Field label="To"><Input type="date" value={range.to} onChange={(e) => { setPreset("custom"); setRange((r) => ({ ...r, to: e.target.value })); }} /></Field>
      </Card>
      {vat.isLoading ? <Spinner /> : vat.error ? <ErrorState error={vat.error} /> : d && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4"><p className="text-xs uppercase text-stone-500">Output VAT (on sales)</p><p className="mt-1 font-mono text-xl font-semibold">{fmt(d.output_vat)}</p></Card>
            <Card className="p-4"><p className="text-xs uppercase text-stone-500">Input VAT (on purchases)</p><p className="mt-1 font-mono text-xl font-semibold">{fmt(d.input_vat)}</p></Card>
            <Card className="p-4"><p className="text-xs uppercase text-stone-500">{net >= 0 ? "VAT to pay KRA" : "VAT credit to carry forward"}</p><p className="mt-1 font-mono text-xl font-semibold">{fmt(Math.abs(net))}</p></Card>
          </div>
          <RateTable title="Sales (invoices, cash sales, less credit notes)" rows={d.sales} total={d.output_vat} />
          <RateTable title="Purchases (bills and expenses)" rows={d.purchases} total={d.input_vat} />
          <p className="text-xs text-stone-500">Input VAT can only be claimed on purchases with a valid eTIMS invoice from the supplier. Check bills marked &quot;Not entered&quot; before filing.</p>
        </div>
      )}
    </div>
  );
}
