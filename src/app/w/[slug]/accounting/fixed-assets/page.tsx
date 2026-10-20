"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Download, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { ASSET_STATUS } from "@/lib/api/assets";
import { api, unwrap } from "@/lib/api/client";
import { downloadCsv, fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function FixedAssetsPage() {
  const { slug, can } = useWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const list = useQuery({
    queryKey: ["fixed-assets", slug, search, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/fixed-assets/", {
      params: { path: { workspace: slug }, query: { search: search || undefined, status: (status || undefined) as never, page_size: 500 } },
    })),
  });
  const rows = list.data?.results ?? [];
  const sum = (k: "cost" | "accumulated_depreciation" | "book_value") => rows.filter((r) => r.status !== "disposed").reduce((a, r) => a + Number(r[k]), 0);
  return (
    <div className="w-full">
      <PageHeader title="Fixed assets" guide="fixed-assets"
        description="The register of what the business owns and uses for years: vehicles, computers, furniture, machinery. Depreciation spreads their cost over their life."
        actions={<div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={!rows.length} onClick={() => downloadCsv("fixed-asset-register.csv", [["Number", "Name", "Category", "Serial", "Bought", "Cost", "Depreciation", "Book value", "Status"],
            ...rows.map((r) => [r.number, r.name, r.category ?? "", r.serial_number ?? "", r.purchase_date, r.cost, r.accumulated_depreciation, r.book_value, r.status ?? ""])])}><Download className="h-4 w-4" /> Register</Button>
          {can("fixedassets.view") && <Link href={`/w/${slug}/accounting/fixed-assets/depreciation`}><Button variant="secondary"><CalendarClock className="h-4 w-4" /> Depreciation</Button></Link>}
          {can("fixedassets.manage") && <Link href={`/w/${slug}/accounting/fixed-assets/new`}><Button><Plus className="h-4 w-4" /> Add asset</Button></Link>}
        </div>} />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-full max-w-xs"><Input placeholder="Search number, name or serial" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="w-48"><Select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option>{Object.entries(ASSET_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></div>
      </div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="No assets yet">Add the vehicles, computers, furniture and machinery the business owns.</EmptyState>
        ) : (
          <Table head={["Number", "Asset", "Bought", "Cost", "Depreciation", "Book value", "Status"]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50">
                <Td className="font-mono text-xs"><Link className="hover:underline" href={`/w/${slug}/accounting/fixed-assets/${r.id}`}>{r.number}</Link></Td>
                <Td><Link className="font-medium hover:underline" href={`/w/${slug}/accounting/fixed-assets/${r.id}`}>{r.name}</Link>{r.serial_number && <span className="block text-xs text-stone-500">{r.serial_number}</span>}</Td>
                <Td className="whitespace-nowrap text-xs">{fmtDate(r.purchase_date)}</Td>
                <Td className="text-right font-mono">{fmt(r.cost)}</Td>
                <Td className="text-right font-mono text-stone-600">{fmt(r.accumulated_depreciation)}</Td>
                <Td className="text-right font-mono font-medium">{fmt(r.book_value)}</Td>
                <Td><Badge tone={ASSET_STATUS[r.status ?? "active"].tone}>{ASSET_STATUS[r.status ?? "active"].label}</Badge></Td>
              </tr>
            ))}
            <tr className="bg-stone-50 font-semibold"><Td colSpan={3}>Total (excluding disposed)</Td><Td className="text-right font-mono">{fmt(sum("cost"))}</Td>
              <Td className="text-right font-mono">{fmt(sum("accumulated_depreciation"))}</Td><Td className="text-right font-mono">{fmt(sum("book_value"))}</Td><Td /></tr>
          </Table>
        )}
      </Card>
    </div>
  );
}
