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

export default function PaymentsPage() {
  const { slug, can } = useWorkspace();
  const dates = useDateQuery("payment_date");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const list = useQuery({
    queryKey: [dates,"payments", slug, search, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/payments/", {
      params: { path: { workspace: slug }, query: { ...dates, search: search || undefined, status: (status || undefined) as "posted" | "void" | undefined, page_size: 100 } },
    })),
  });
  const rows = list.data?.results ?? [];
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Customer payments"
        description="Money received against invoices. Each payment is applied to one or more invoices; anything left over stays as the customer's credit."
        guide="payments"
        actions={can("payments.create") && <Link href={`/w/${slug}/sales/payments/new`}><Button><Plus className="h-4 w-4" /> Record payment</Button></Link>}
      />
      <ListFilters search={search} setSearch={setSearch} status={status} setStatus={setStatus} statuses={[["posted", "Posted"], ["void", "Void"]]} placeholder="Search number, M-Pesa code or customer" />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="No payments found" />
        ) : (
          <Table head={["Date", "Number", "Customer", "Method", "Reference", "Amount", "Unapplied", ""]}>
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-stone-50">
                <Td className="whitespace-nowrap">{fmtDate(p.payment_date)}</Td>
                <Td><Link href={`/w/${slug}/sales/payments/${p.id}`} className="font-mono text-xs font-medium hover:underline">{p.number}</Link></Td>
                <Td>{p.customer_name}</Td>
                <Td>{METHODS.find((m) => m.value === p.method)?.label}</Td>
                <Td className="font-mono text-xs">{p.reference || "-"}</Td>
                <Td className="text-right font-mono">{fmt(p.amount)}</Td>
                <Td className="text-right font-mono">{Number(p.unallocated_amount) ? fmt(p.unallocated_amount) : ""}</Td>
                <Td>{p.status === "void" && <Badge>Void</Badge>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
