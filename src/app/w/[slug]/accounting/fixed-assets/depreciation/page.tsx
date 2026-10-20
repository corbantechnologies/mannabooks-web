"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, EmptyState, ErrorState, Field, FormError, Input, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

function lastMonth(): string {
  const d = new Date();
  const end = new Date(d.getFullYear(), d.getMonth(), 0);
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}`;
}
const label = (iso: string) => new Date(`${iso.slice(0, 7)}-01T00:00:00`).toLocaleDateString("en-KE", { month: "long", year: "numeric" });

export default function DepreciationPage() {
  const { slug, can } = useWorkspace();
  const p = { params: { path: { workspace: slug } } };
  const [month, setMonth] = useState(lastMonth());
  const day = `${month}-01`;
  const preview = useQuery({
    queryKey: ["depreciation-preview", slug, month],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/depreciation/preview/", { params: { path: { workspace: slug }, query: { month: day } } })),
    enabled: Boolean(month),
  });
  const runs = useQuery({ queryKey: ["depreciation-runs", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/depreciation/", p)) });
  const run = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/depreciation/run/", { ...p, body: { month: day } })),
    onSuccess: (r) => toast.success(`Depreciation of ${fmt(r.total)} posted`),
  });
  const undo = useMutation({
    mutationFn: async (m: string) => unwrap(await api.POST("/api/v1/w/{workspace}/depreciation/undo/", { ...p, body: { month: m } })),
    onSuccess: () => toast.success("Run undone"),
    onError: (e) => toast.error(e.message),
  });
  const rows = preview.data ?? [];
  const total = rows.reduce((a, r) => a + Number(r.amount), 0);
  const history = runs.data ?? [];
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/accounting/fixed-assets`} className="text-sm text-stone-500 hover:underline">&larr; Fixed assets</Link>
      <PageHeader title="Depreciation" guide="fixed-assets"
        description="Charge each month's depreciation once the month ends. One journal is posted per run: depreciation expense against accumulated depreciation. Months missed are caught up." />
      <Card className="mb-4 space-y-3 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Depreciate up to the end of"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
          {can("fixedassets.depreciate") && <Button disabled={!rows.length} loading={run.isPending} onClick={() => confirm(`Post depreciation of ${fmt(total)} up to ${label(day)}?`) && run.mutate()}>Run depreciation</Button>}
        </div>
        <FormError error={run.error} />
        {preview.isLoading ? <Spinner /> : preview.error ? <ErrorState error={preview.error} /> : rows.length === 0 ? (
          <p className="text-sm text-stone-500">Nothing to charge up to {label(day)}: every asset is depreciated that far, or none are in use yet.</p>
        ) : (
          <Table head={["Asset", "Months", "Depreciation", "Book value after"]}>
            {rows.map((r) => <tr key={r.asset_id}><Td><Link className="hover:underline" href={`/w/${slug}/accounting/fixed-assets/${r.asset_id}`}><span className="mr-2 font-mono text-xs text-stone-400">{r.number}</span>{r.name}</Link></Td>
              <Td>{r.months}</Td><Td className="text-right font-mono">{fmt(r.amount)}</Td><Td className="text-right font-mono text-stone-600">{fmt(r.book_value_after)}</Td></tr>)}
            <tr className="bg-stone-50 font-semibold"><Td colSpan={2}>Total</Td><Td className="text-right font-mono">{fmt(total)}</Td><Td /></tr>
          </Table>
        )}
      </Card>
      <h2 className="mb-2 text-sm font-semibold">Runs so far</h2>
      <Card>
        {runs.isLoading ? <div className="px-4"><Spinner /></div> : history.length === 0 ? <EmptyState title="No depreciation run yet" /> : (
          <Table head={["Month", "Assets", "Total", ""]}>
            {history.map((r, i) => (
              <tr key={r.run_month}><Td>{label(r.run_month)}</Td><Td>{r.assets}</Td><Td className="text-right font-mono">{fmt(r.total)}</Td>
                <Td className="text-right">{i === 0 && can("fixedassets.depreciate") && <Button variant="ghost" loading={undo.isPending} onClick={() => confirm(`Undo the ${label(r.run_month)} run? Its journal is removed.`) && undo.mutate(r.run_month)}>Undo</Button>}</Td></tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
