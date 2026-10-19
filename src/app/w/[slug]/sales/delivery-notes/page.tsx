"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ListFilters } from "@/components/doc-list";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { DELIVERY_STATUS } from "@/lib/api/sales";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

type Status = keyof typeof DELIVERY_STATUS;

export default function DeliveryNotesPage() {
  const { slug, can } = useWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const list = useQuery({
    queryKey: ["delivery-notes", slug, search, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/delivery-notes/", {
      params: { path: { workspace: slug }, query: { search: search || undefined, status: (status || undefined) as Status | undefined, page_size: 100 } },
    })),
  });
  const rows = list.data?.results ?? [];
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Delivery notes"
        description="Goods sent to customers, signed for on delivery. They record quantities only; the invoice carries the money."
        guide="delivery-notes"
        actions={can("deliverynotes.manage") && <Link href={`/w/${slug}/sales/delivery-notes/new`}><Button><Plus className="h-4 w-4" /> New delivery note</Button></Link>}
      />
      <ListFilters search={search} setSearch={setSearch} status={status} setStatus={setStatus} statuses={Object.entries(DELIVERY_STATUS).map(([k, v]) => [k, v.label])} placeholder="Search number, customer, vehicle or driver" />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="No delivery notes found" />
        ) : (
          <Table head={["Date", "Number", "Customer", "Invoice", "Vehicle", "Status"]}>
            {rows.map((d) => (
              <tr key={d.id} className="hover:bg-stone-50">
                <Td className="whitespace-nowrap">{fmtDate(d.delivery_date)}</Td>
                <Td><Link href={`/w/${slug}/sales/delivery-notes/${d.id}`} className="font-mono text-xs font-medium hover:underline">{d.number}</Link></Td>
                <Td>{d.customer_name}</Td>
                <Td className="font-mono text-xs">{d.invoice_number ?? "-"}</Td>
                <Td>{d.vehicle || "-"}</Td>
                <Td><Badge tone={DELIVERY_STATUS[d.status as Status].tone}>{DELIVERY_STATUS[d.status as Status].label}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
