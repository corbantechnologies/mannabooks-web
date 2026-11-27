"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { ActionMenu } from "@/components/action-menu";
import { ListFilters, PeriodShown } from "@/components/doc-list";
import { Badge, Card, EmptyState, ErrorState, Input, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useDateQuery } from "@/lib/period";
import { useWorkspace } from "@/lib/workspace";

export default function ExpensesPage() {
  const { slug, can } = useWorkspace();
  const dates = useDateQuery("expense_date");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const list = useQuery({
    queryKey: [dates,"expenses", slug, search, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/expenses/", {
      params: { path: { workspace: slug }, query: { ...dates, search: search || undefined, page_size: 100 } },
    })),
  });
  const rows = list.data?.results ?? [];
  void Badge; void fmt; void fmtDate; void ListFilters; void Input; void status; void setStatus;
  return (
    <div className="w-full">
      <PageHeader title="Expenses" description="Money spent straight from a bank, M-Pesa or cash account: fuel, airtime, rent, bank charges, petty cash." guide="expenses" actions={can("banking.spend") && <ActionMenu label="Actions" primary actions={[
        { label: "Spend money", href: `/w/${slug}/banking/expenses/new` },
        { label: "Record in bulk", href: `/w/${slug}/banking/expenses/bulk` },
      ]} />} />
      <div className="mb-4 flex flex-wrap items-center gap-3"><div className="w-full max-w-sm"><Input placeholder="Search payee or reference" value={search} onChange={(e) => setSearch(e.target.value)} /></div><PeriodShown count={{ path: "/api/v1/w/{workspace}/expenses/", query: { search: search || undefined }, shown: list.data?.count }} /></div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="Nothing here yet" />
        ) : (
          <Table head={["Date", "Number", "Paid to", "From", "Amount", ""]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50">
                <Td className="whitespace-nowrap">{fmtDate(r.expense_date)}</Td>
                <Td><Link href={`/w/${slug}/banking/expenses/${r.id}`} className="font-mono text-xs font-medium hover:underline">{r.number}</Link></Td>
                <Td>{r.payee || r.supplier_name || "-"}</Td>
                <Td>{r.paid_from_name}</Td>
                <Td className="text-right font-mono">{fmt(r.total)}</Td>
                <Td>{r.status === "void" && <Badge>Void</Badge>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
