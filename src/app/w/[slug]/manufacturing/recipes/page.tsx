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

export default function RecipesPage() {
  const { slug, can } = useWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const list = useQuery({
    queryKey: ["boms", slug, search, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/bills-of-materials/", {
      params: { path: { workspace: slug }, query: { search: search || undefined, page_size: 100 } },
    })),
  });
  const rows = list.data?.results ?? [];
  void Badge; void fmt; void fmtDate; void ListFilters; void Input; void status; void setStatus;
  return (
    <div className="max-w-6xl">
      <PageHeader title="Recipes (bills of materials)" description="What goes into each product you make, e.g. 10 blocks from 1 bag of cement and 3 bags of sand." guide="manufacturing" actions={can("manufacturing.manage") && <Link href={`/w/${slug}/manufacturing/recipes/new`}><Button><Plus className="h-4 w-4" /> New recipe</Button></Link>} />
      <div className="mb-4 max-w-sm"><Input placeholder="Search product" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="Nothing here yet" />
        ) : (
          <Table head={["Product", "Name", "Makes", "Components", ""]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50">
                <Td><Link href={`/w/${slug}/manufacturing/recipes/${r.id}`} className="font-medium hover:underline">{r.product_name}</Link></Td>
                <Td>{r.name || "-"}</Td>
                <Td className="text-right font-mono">{Number(r.output_quantity)}</Td>
                <Td className="text-stone-600">{r.lines.map((l) => `${Number(l.quantity)} ${l.unit} ${l.component_name}`).join(", ")}</Td>
                <Td>{!r.is_active && <Badge>Inactive</Badge>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
