"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { CatalogueShare } from "@/components/catalogue-share";
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import type { Catalogue } from "@/lib/api/types";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function CataloguesPage() {
  const { slug, can } = useWorkspace();
  const [search, setSearch] = useState("");
  const [sharing, setSharing] = useState<Catalogue | null>(null);
  const list = useQuery({
    queryKey: ["catalogues", slug, search],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/catalogues/", {
      params: { path: { workspace: slug }, query: { search: search || undefined, page_size: 100 } },
    })),
  });
  const rows = list.data?.results ?? [];
  return (
    <div className="w-full">
      <PageHeader title="Catalogues" guide="catalogues"
        description="Send clients a list of your products. They pick what they want and how many, and MannaBooks writes the quotation for you."
        actions={<>
          <Link href={`/w/${slug}/sales/catalogues/analytics`}><Button variant="secondary"><BarChart3 className="h-4 w-4" /> Analytics</Button></Link>
          {can("quotations.manage") && <Link href={`/w/${slug}/sales/catalogues/new`}><Button><Plus className="h-4 w-4" /> New catalogue</Button></Link>}
        </>} />
      <div className="mb-4 max-w-xs"><Input placeholder="Search name or customer" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="No catalogues yet">Make one from a category (say, Laptops) or pick products by hand, then share the link by WhatsApp or email.</EmptyState>
        ) : (
          <Table head={["Catalogue", "For", "Products", "Views", "Quotes", "Status", ""]}>
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-stone-50">
                <Td><Link href={`/w/${slug}/sales/catalogues/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                  <div className="text-xs text-stone-500">{c.quote_mode === "auto" && c.show_prices ? "Quotes go out at once" : "You review quotes first"}</div></Td>
                <Td>{c.customer_name ?? <span className="text-stone-500">Anyone with the link</span>}</Td>
                <Td className="text-right">{c.product_count}</Td>
                <Td className="text-right">{c.view_count}{c.last_viewed_at && <div className="text-xs text-stone-500">{fmtDate(c.last_viewed_at)}</div>}</Td>
                <Td className="text-right">{c.quote_count}</Td>
                <Td>{c.is_open ? <Badge tone="green">Open</Badge> : <Badge>Closed</Badge>}</Td>
                <Td className="text-right">{c.is_open && <Button variant="ghost" className="px-2 py-1" onClick={() => setSharing(c)}>Share</Button>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {sharing && <CatalogueShare catalogue={sharing} open onClose={() => setSharing(null)} />}
    </div>
  );
}
