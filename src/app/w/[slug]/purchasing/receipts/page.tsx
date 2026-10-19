"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ListFilters } from "@/components/doc-list";
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { POSTED_STATUS } from "@/lib/api/purchasing";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function GoodsReceiptsPage() {
  const { slug, can } = useWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const list = useQuery({
    queryKey: ["goods-receipts", slug, search, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/goods-receipts/", {
      params: { path: { workspace: slug }, query: { search: search || undefined, status: (status || undefined) as never, page_size: 100 } },
    })),
  });
  const rows = list.data?.results ?? [];
  void Badge; void fmt; void fmtDate; void ListFilters; void Input; void status; void setStatus;
  return (
    <div className="max-w-6xl">
      <PageHeader title="Goods received" description="Deliveries from suppliers (GRNs). Stock items go straight into the warehouse." guide="goods-received" actions={can("goodsreceipts.manage") && <Link href={`/w/${slug}/purchasing/receipts/new`}><Button><Plus className="h-4 w-4" /> Receive goods</Button></Link>} />
      <ListFilters search={search} setSearch={setSearch} status={status} setStatus={setStatus} statuses={Object.entries(POSTED_STATUS).map(([k, v]) => [k, v.label])} placeholder="Search number or supplier" />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="Nothing here yet" />
        ) : (
          <Table head={["Date", "Number", "Supplier", "Order", "Warehouse", "Value", "Status"]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50">
                <Td className="whitespace-nowrap">{fmtDate(r.receipt_date)}</Td>
                <Td><Link href={`/w/${slug}/purchasing/receipts/${r.id}`} className="font-mono text-xs font-medium hover:underline">{r.number}</Link></Td>
                <Td>{r.supplier_name}</Td>
                <Td className="font-mono text-xs">{r.purchase_order_number ?? "-"}</Td>
                <Td>{r.warehouse_name}</Td>
                <Td className="text-right font-mono">{fmt(r.total_value)}</Td>
                <Td><Badge tone={POSTED_STATUS[r.status ?? "posted"].tone}>{r.status === "posted" ? (r.is_billed ? "Billed" : "Not billed") : "Void"}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
