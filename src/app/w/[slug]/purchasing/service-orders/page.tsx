"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ListFilters } from "@/components/doc-list";
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { SO_STATUS } from "@/lib/api/purchasing";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function ServiceOrdersPage() {
  const { slug, can } = useWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const list = useQuery({
    queryKey: ["service-orders", slug, search, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/service-orders/", {
      params: { path: { workspace: slug }, query: { search: search || undefined, status: (status || undefined) as never, page_size: 100 } },
    })),
  });
  const rows = list.data?.results ?? [];
  void Badge; void fmt; void fmtDate; void ListFilters; void Input; void status; void setStatus;
  return (
    <div className="w-full">
      <PageHeader title="Service orders" description="Work ordered from suppliers: repairs, cleaning, consultancy. Confirm the work is done before paying." guide="service-orders" actions={can("purchaseorders.create") && <Link href={`/w/${slug}/purchasing/service-orders/new`}><Button><Plus className="h-4 w-4" /> New service order</Button></Link>} />
      <ListFilters search={search} setSearch={setSearch} status={status} setStatus={setStatus} statuses={Object.entries(SO_STATUS).map(([k, v]) => [k, v.label])} placeholder="Search number or supplier" />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="Nothing here yet" />
        ) : (
          <Table head={["Date", "Number", "Supplier", "Needed by", "Total", "Status"]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50">
                <Td className="whitespace-nowrap">{fmtDate(r.order_date)}</Td>
                <Td><Link href={`/w/${slug}/purchasing/service-orders/${r.id}`} className="font-mono text-xs font-medium hover:underline">{r.number}</Link></Td>
                <Td>{r.supplier_name}</Td>
                <Td>{r.required_by ? fmtDate(r.required_by) : "-"}</Td>
                <Td className="text-right font-mono">{fmt(r.total)}</Td>
                <Td><Badge tone={SO_STATUS[r.status ?? "draft"].tone}>{SO_STATUS[r.status ?? "draft"].label}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
