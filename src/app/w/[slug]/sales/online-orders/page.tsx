"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ListFilters } from "@/components/doc-list";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { ONLINE_STATUS, PAYMENT_STATUS } from "@/lib/api/shop";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function OnlineOrdersPage() {
  const { slug, context } = useWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const list = useQuery({
    queryKey: ["online-orders", slug, search, status],
    refetchInterval: 60000, // new orders show up without a reload
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/online-orders/", {
      params: { path: { workspace: slug }, query: { search: search || undefined, status: (status || undefined) as never, page_size: 100 } },
    })),
  });
  const rows = list.data?.results ?? [];
  const open = context.workspace.store_enabled;
  return (
    <div className="w-full">
      <PageHeader title="Online orders" guide="online-shop"
        description="Orders from your online shop. Confirm them, get them ready, then complete them to record the sale and take the stock out."
        actions={open
          ? <a href={`/shop/${slug}`} target="_blank" rel="noreferrer"><Button variant="secondary"><ExternalLink className="h-4 w-4" /> Open my shop</Button></a>
          : <Link href={`/w/${slug}/settings`}><Button variant="secondary">Open the shop in Settings</Button></Link>} />
      {!open && <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Your shop is closed. Switch it on in Settings and tick Sell online on the products to show.</div>}
      <ListFilters search={search} setSearch={setSearch} status={status} setStatus={setStatus} placeholder="Search number, name or phone"
        statuses={Object.entries(ONLINE_STATUS).map(([k, [l]]) => [k, l])} />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="No orders yet">Share your shop link on WhatsApp, Instagram or your website.</EmptyState>
        ) : (
          <Table head={["Order", "Customer", "Collect or deliver", "Total", "Payment", "Status"]}>
            {rows.map((o) => (
              <tr key={o.id} className={`hover:bg-stone-50 ${o.status === "new" ? "font-semibold" : ""}`}>
                <Td><Link href={`/w/${slug}/sales/online-orders/${o.id}`} className="hover:underline">{o.number}</Link><div className="text-xs font-normal text-stone-500">{fmtDate(o.created_at)}</div></Td>
                <Td>{o.customer_name}<div className="text-xs font-normal text-stone-500">{o.phone}</div></Td>
                <Td className="font-normal text-stone-600">{o.fulfilment === "delivery" ? `Deliver: ${o.address}` : "Pickup"}</Td>
                <Td className="text-right font-mono">{fmt(o.total)}</Td>
                <Td><Badge tone={PAYMENT_STATUS[o.payment_status][1]}>{PAYMENT_STATUS[o.payment_status][0]}</Badge></Td>
                <Td><Badge tone={ONLINE_STATUS[o.status][1]}>{ONLINE_STATUS[o.status][0]}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
