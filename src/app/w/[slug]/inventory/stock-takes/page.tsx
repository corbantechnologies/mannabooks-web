"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ListFilters } from "@/components/doc-list";
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { TAKE_STATUS } from "@/lib/api/purchasing";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function StockTakesPage() {
  const { slug, can } = useWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const list = useQuery({
    queryKey: ["stock-takes", slug, search, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/stock-takes/", {
      params: { path: { workspace: slug }, query: { search: search || undefined, page_size: 100 } },
    })),
  });
  const rows = list.data?.results ?? [];
  void Badge; void fmt; void fmtDate; void ListFilters; void Input; void status; void setStatus; void setSearch;
  return (
    <div className="max-w-6xl">
      <PageHeader title="Stock takes" description="Count what is really on the shelves. Differences are posted to Stock adjustments and losses." guide="stock-takes" actions={can("inventory.manage") && <Link href={`/w/${slug}/inventory/stock-takes/new`}><Button><Plus className="h-4 w-4" /> Start a count</Button></Link>} />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="Nothing here yet" />
        ) : (
          <Table head={["Date", "Number", "Warehouse", "Counted", "Difference", "Status"]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50">
                <Td className="whitespace-nowrap">{fmtDate(r.count_date)}</Td>
                <Td><Link href={`/w/${slug}/inventory/stock-takes/${r.id}`} className="font-mono text-xs font-medium hover:underline">{r.number}</Link></Td>
                <Td>{r.warehouse_name}{r.category_name ? ` · ${r.category_name}` : ""}</Td>
                <Td>{r.counted}</Td>
                <Td className={`text-right font-mono ${Number(r.difference_value) < 0 ? "text-red-600" : ""}`}>{r.status === "posted" ? fmt(r.difference_value) : ""}</Td>
                <Td><Badge tone={TAKE_STATUS[r.status ?? "counting"].tone}>{TAKE_STATUS[r.status ?? "counting"].label}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
