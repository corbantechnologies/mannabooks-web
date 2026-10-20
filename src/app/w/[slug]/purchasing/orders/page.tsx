"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ListFilters } from "@/components/doc-list";
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { PO_STATUS } from "@/lib/api/purchasing";
import { fmt, fmtDate } from "@/lib/format";
import { useDateQuery } from "@/lib/period";
import { useWorkspace } from "@/lib/workspace";

export default function PurchaseOrdersPage() {
  const { slug, can } = useWorkspace();
  const dates = useDateQuery("order_date");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const list = useQuery({
    queryKey: [dates,"purchase-orders", slug, search, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/purchase-orders/", {
      params: { path: { workspace: slug }, query: { ...dates, search: search || undefined, status: (status || undefined) as never, page_size: 100 } },
    })),
  });
  const rows = list.data?.results ?? [];
  void Badge; void fmt; void fmtDate; void ListFilters; void Input; void status; void setStatus;
  return (
    <div className="max-w-6xl">
      <PageHeader title="Purchase orders" description="Orders (LPOs) sent to suppliers for goods. Approve an order, then receive the goods against it." guide="purchase-orders" actions={can("purchaseorders.create") && <Link href={`/w/${slug}/purchasing/orders/new`}><Button><Plus className="h-4 w-4" /> New order</Button></Link>} />
      <ListFilters search={search} setSearch={setSearch} status={status} setStatus={setStatus} statuses={Object.entries(PO_STATUS).map(([k, v]) => [k, v.label])} placeholder="Search number or supplier" />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="Nothing here yet" />
        ) : (
          <Table head={["Date", "Number", "Supplier", "Expected", "Total", "Status"]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50">
                <Td className="whitespace-nowrap">{fmtDate(r.order_date)}</Td>
                <Td><Link href={`/w/${slug}/purchasing/orders/${r.id}`} className="font-mono text-xs font-medium hover:underline">{r.number}</Link></Td>
                <Td>{r.supplier_name}</Td>
                <Td>{r.expected_date ? fmtDate(r.expected_date) : "-"}</Td>
                <Td className="text-right font-mono">{fmt(r.total)}</Td>
                <Td><Badge tone={PO_STATUS[r.status ?? "draft"].tone}>{PO_STATUS[r.status ?? "draft"].label}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
