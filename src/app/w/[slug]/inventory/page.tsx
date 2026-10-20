"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWarehouses } from "@/lib/api/purchasing";
import { downloadCsv, fmt } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function StockPage() {
  const { slug, can } = useWorkspace();
  const warehouses = useWarehouses(slug);
  const [warehouse, setWarehouse] = useState("");
  const [search, setSearch] = useState("");
  const [low, setLow] = useState(false);
  const levels = useQuery({
    queryKey: ["stock-levels", slug, warehouse, search, low],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/stock/levels/", {
      params: { path: { workspace: slug }, query: { warehouse: warehouse || undefined, search: search || undefined, low: low ? "true" : undefined, page_size: 200 } as never },
    })),
  });
  const rows = levels.data?.results ?? [];
  const total = rows.reduce((s, r) => s + Number(r.value), 0);
  return (
    <div className="w-full">
      <PageHeader title="Stock" description="What is on hand in each warehouse, at its average cost." guide="inventory"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => downloadCsv("stock.csv", [["Product", "Code", "Warehouse", "Quantity", "Average cost", "Value"],
              ...rows.map((r) => [r.product_name, r.product_code, r.warehouse_name, r.quantity, r.average_cost, r.value])])}>Export</Button>
            {can("inventory.manage") && <Link href={`/w/${slug}/inventory/adjustments/new?reason=opening`}><Button>Enter opening stock</Button></Link>}
          </div>
        } />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="w-64"><Input placeholder="Search product or code" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="w-52"><Select value={warehouse} onChange={(e) => setWarehouse(e.target.value)}><option value="">All warehouses</option>{(warehouses.data?.results ?? []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={low} onChange={(e) => setLow(e.target.checked)} /> Low stock only</label>
      </div>
      <Card>
        {levels.isLoading ? <div className="px-4"><Spinner /></div> : levels.error ? <div className="p-4"><ErrorState error={levels.error} /></div> : rows.length === 0 ? (
          <EmptyState title={low ? "Nothing is low" : "No stock yet"}>Tick &quot;Track stock&quot; on products, then receive goods or enter opening stock.</EmptyState>
        ) : (
          <Table head={["Product", "Warehouse", "On hand", "Average cost", "Value", ""]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50">
                <Td><Link href={`/w/${slug}/inventory/products/${r.product_id}`} className="font-medium hover:underline">{r.product_name}</Link>{r.product_code && <span className="ml-1 font-mono text-xs text-stone-400">{r.product_code}</span>}</Td>
                <Td>{r.warehouse_name}</Td>
                <Td className="text-right font-mono">{Number(r.quantity)} {r.unit}</Td>
                <Td className="text-right font-mono">{fmt(r.average_cost)}</Td>
                <Td className="text-right font-mono">{fmt(r.value)}</Td>
                <Td>{r.is_low && <Badge tone="red">Low</Badge>}</Td>
              </tr>
            ))}
            <tr className="bg-stone-50 font-semibold"><Td colSpan={4}>Total value</Td><Td className="text-right font-mono">{fmt(total)}</Td><Td>{""}</Td></tr>
          </Table>
        )}
      </Card>
    </div>
  );
}
