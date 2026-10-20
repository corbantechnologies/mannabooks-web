"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ListFilters } from "@/components/doc-list";
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function TransfersPage() {
  const { slug, can } = useWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const list = useQuery({
    queryKey: ["stock-transfers", slug, search, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/stock-transfers/", {
      params: { path: { workspace: slug }, query: { search: search || undefined, page_size: 100 } },
    })),
  });
  const rows = list.data?.results ?? [];
  void Badge; void fmt; void fmtDate; void ListFilters; void Input; void status; void setStatus;
  return (
    <div className="w-full">
      <PageHeader title="Stock transfers" description="Stock moved between warehouses." guide="inventory" actions={can("inventory.manage") && <Link href={`/w/${slug}/inventory/transfers/new`}><Button><Plus className="h-4 w-4" /> New transfer</Button></Link>} />
      <div className="mb-4 max-w-sm"><Input placeholder="Search number" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="Nothing here yet" />
        ) : (
          <Table head={["Date", "Number", "From", "To", "Value", ""]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50">
                <Td className="whitespace-nowrap">{fmtDate(r.transfer_date)}</Td>
                <Td><Link href={`/w/${slug}/inventory/transfers/${r.id}`} className="font-mono text-xs font-medium hover:underline">{r.number}</Link></Td>
                <Td>{r.from_warehouse_name}</Td>
                <Td>{r.to_warehouse_name}</Td>
                <Td className="text-right font-mono">{fmt(r.total_value)}</Td>
                <Td>{r.status === "void" && <Badge>Void</Badge>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
