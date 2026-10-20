"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ListFilters } from "@/components/doc-list";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { METHODS } from "@/lib/api/sales";
import { fmt, fmtDate } from "@/lib/format";
import { useDateQuery } from "@/lib/period";
import { useWorkspace } from "@/lib/workspace";

export default function CashSalesPage() {
  const { slug, can } = useWorkspace();
  const dates = useDateQuery("issue_date");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const list = useQuery({
    queryKey: [dates,"receipts", slug, search, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/receipts/", {
      params: { path: { workspace: slug }, query: { ...dates, search: search || undefined, status: (status || undefined) as "issued" | "void" | undefined, page_size: 100 } },
    })),
  });
  const rows = list.data?.results ?? [];
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Cash sales"
        description="Sales paid on the spot by cash, M-Pesa or card. Each is posted straight to the account the money went into."
        guide="cash-sales"
        actions={can("receipts.create") && <Link href={`/w/${slug}/sales/cash-sales/new`}><Button><Plus className="h-4 w-4" /> New cash sale</Button></Link>}
      />
      <ListFilters search={search} setSearch={setSearch} status={status} setStatus={setStatus} statuses={[["issued", "Issued"], ["void", "Void"]]} placeholder="Search number, customer or M-Pesa code" />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="No cash sales found" />
        ) : (
          <Table head={["Date", "Number", "Customer", "Paid by", "Total", ""]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50">
                <Td className="whitespace-nowrap">{fmtDate(r.issue_date)}</Td>
                <Td><Link href={`/w/${slug}/sales/cash-sales/${r.id}`} className="font-mono text-xs font-medium hover:underline">{r.number}</Link></Td>
                <Td>{r.customer_name || "Walk-in"}</Td>
                <Td>{METHODS.find((m) => m.value === r.method)?.label} {r.payment_reference && <span className="font-mono text-xs">{r.payment_reference}</span>}</Td>
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
