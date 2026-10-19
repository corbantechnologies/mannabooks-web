"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ListFilters } from "@/components/doc-list";
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { MO_STATUS } from "@/lib/api/purchasing";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function ProductionPage() {
  const { slug, can } = useWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const list = useQuery({
    queryKey: ["production-orders", slug, search, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/production-orders/", {
      params: { path: { workspace: slug }, query: { search: search || undefined, page_size: 100 } },
    })),
  });
  const rows = list.data?.results ?? [];
  void Badge; void fmt; void fmtDate; void ListFilters; void Input; void status; void setStatus;
  return (
    <div className="max-w-6xl">
      <PageHeader title="Production" description="Making products from their recipes. Completing an order uses up the components and adds the product at their cost." guide="manufacturing" actions={can("manufacturing.manage") && <Link href={`/w/${slug}/manufacturing/production/new`}><Button><Plus className="h-4 w-4" /> New production order</Button></Link>} />
      <div className="mb-4 max-w-sm"><Input placeholder="Search number or product" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="Nothing here yet" />
        ) : (
          <Table head={["Date", "Number", "Product", "Qty", "Cost", "Status"]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50">
                <Td className="whitespace-nowrap">{fmtDate(r.production_date)}</Td>
                <Td><Link href={`/w/${slug}/manufacturing/production/${r.id}`} className="font-mono text-xs font-medium hover:underline">{r.number}</Link></Td>
                <Td>{r.product_name}</Td>
                <Td className="text-right font-mono">{Number(r.quantity)}</Td>
                <Td className="text-right font-mono">{r.status === "completed" ? fmt(r.total_cost) : ""}</Td>
                <Td><Badge tone={MO_STATUS[r.status ?? "planned"].tone}>{MO_STATUS[r.status ?? "planned"].label}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
