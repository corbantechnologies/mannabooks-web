"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { downloadCsv, fmt, fmtNonZero, todayIso } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function TrialBalancePage() {
  const { slug, context } = useWorkspace();
  const [asOf, setAsOf] = useState(todayIso());
  const tb = useQuery({
    queryKey: ["trial-balance", slug, asOf],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/reports/trial-balance/", { params: { path: { workspace: slug }, query: { as_of: asOf } } })),
  });
  const data = tb.data;

  function exportCsv() {
    if (!data) return;
    downloadCsv(`trial-balance-${asOf}.csv`, [
      ["Code", "Account", "Debit", "Credit"],
      ...data.rows.map((r) => [r.code, r.name, r.debit, r.credit]),
      ["", "Total", data.total_debit, data.total_credit],
    ]);
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Trial balance"
        description={`Every account's balance on a date, in ${context.workspace.currency}. Debits always equal credits; if they don't, something is wrong and MannaBooks flags it.`}
        guide="trial-balance"
        actions={<Button variant="secondary" onClick={exportCsv} disabled={!data?.rows.length}><Download className="h-4 w-4" /> Export CSV</Button>}
      />
      <div className="mb-4 flex items-end gap-3">
        <Field label="As at"><Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} /></Field>
        {data && (data.balanced ? <Badge tone="green">Balanced</Badge> : <Badge tone="red">Out of balance</Badge>)}
      </div>
      <Card>
        {tb.isLoading ? <div className="px-4"><Spinner /></div> : tb.error ? <div className="p-4"><ErrorState error={tb.error} /></div> : data!.rows.length === 0 ? (
          <EmptyState title="Nothing posted yet">Post opening balances or journal entries to see balances here.</EmptyState>
        ) : (
          <Table head={["Code", "Account", "Debit", "Credit"]}>
            {data!.rows.map((r) => (
              <tr key={r.account_id}>
                <Td className="w-20 font-mono text-xs">{r.code}</Td>
                <Td><Link href={`/w/${slug}/accounting/accounts/${r.account_id}`} className="hover:underline">{r.name}</Link></Td>
                <Td className="text-right font-mono">{fmtNonZero(r.debit)}</Td>
                <Td className="text-right font-mono">{fmtNonZero(r.credit)}</Td>
              </tr>
            ))}
            <tr className="bg-stone-50 font-semibold">
              <Td colSpan={2}>Total</Td>
              <Td className="text-right font-mono">{fmt(data!.total_debit)}</Td>
              <Td className="text-right font-mono">{fmt(data!.total_credit)}</Td>
            </tr>
          </Table>
        )}
      </Card>
    </div>
  );
}
