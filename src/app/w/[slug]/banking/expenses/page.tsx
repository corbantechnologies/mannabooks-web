"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ListFilters } from "@/components/doc-list";
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Spinner, Table, Td } from "@/components/ui";
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
    <div className="max-w-6xl">
      <PageHeader title="Expenses" description="Money spent straight from a bank, M-Pesa or cash account: fuel, airtime, rent, bank charges, petty cash." guide="expenses" actions={can("banking.spend") && <Link href={`/w/${slug}/banking/expenses/new`}><Button><Plus className="h-4 w-4" /> Spend money</Button></Link>} />
      <div className="mb-4 max-w-sm"><Input placeholder="Search payee or reference" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
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
