"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Card, EmptyState, ErrorState, Field, Input, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate, fmtNonZero } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function AccountLedgerPage() {
  const { slug } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const ledger = useQuery({
    queryKey: ["account-ledger", slug, id, from, to],
    queryFn: async () =>
      unwrap(await api.GET("/api/v1/w/{workspace}/ledger-accounts/{id}/ledger/", {
        params: { path: { workspace: slug, id }, query: { from: from || undefined, to: to || undefined } },
      })),
  });
  const data = ledger.data;

  return (
    <div className="max-w-6xl">
      <Link href={`/w/${slug}/accounting/chart`} className="text-sm text-stone-500 hover:underline">&larr; Chart of accounts</Link>
      <PageHeader title={data ? `${data.account.code} ${data.account.name}` : "Account"} description="Every posted entry in this account, with the running balance." guide="chart-of-accounts" />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      {ledger.isLoading ? <Spinner /> : ledger.error ? <ErrorState error={ledger.error} /> : (
        <Card>
          <Table head={["Date", "Entry", "Description", "Debit", "Credit", "Balance"]}>
            <tr className="bg-stone-50">
              <Td colSpan={5} className="text-stone-600">Opening balance</Td>
              <Td className="text-right font-mono">{fmt(data!.opening_balance)}</Td>
            </tr>
            {data!.lines.map((l, i) => (
              <tr key={`${l.entry_id}-${i}`}>
                <Td className="whitespace-nowrap">{fmtDate(l.entry_date)}</Td>
                <Td><Link href={`/w/${slug}/accounting/journals/${l.entry_id}`} className="font-mono text-xs text-brand-700 hover:underline">{l.number}</Link></Td>
                <Td>{l.description}</Td>
                <Td className="text-right font-mono">{fmtNonZero(l.debit)}</Td>
                <Td className="text-right font-mono">{fmtNonZero(l.credit)}</Td>
                <Td className="text-right font-mono">{fmt(l.balance)}</Td>
              </tr>
            ))}
            {data!.lines.length === 0 && <tr><Td colSpan={6}><EmptyState title="No entries in this range" /></Td></tr>}
            <tr className="bg-stone-50 font-semibold">
              <Td colSpan={5}>Closing balance</Td>
              <Td className="text-right font-mono">{fmt(data!.closing_balance)}</Td>
            </tr>
          </Table>
        </Card>
      )}
    </div>
  );
}
