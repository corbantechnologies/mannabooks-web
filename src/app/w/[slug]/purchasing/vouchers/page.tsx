"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ListFilters } from "@/components/doc-list";
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { PV_STATUS } from "@/lib/api/purchasing";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function VouchersPage() {
  const { slug, can } = useWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const list = useQuery({
    queryKey: ["payment-vouchers", slug, search, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/payment-vouchers/", {
      params: { path: { workspace: slug }, query: { search: search || undefined, status: (status || undefined) as never, page_size: 100 } },
    })),
  });
  const rows = list.data?.results ?? [];
  void Badge; void fmt; void fmtDate; void ListFilters; void Input; void status; void setStatus;
  return (
    <div className="w-full">
      <PageHeader title="Payment vouchers" description="Requests to pay suppliers. Someone with approval rights approves each one before it is paid." guide="payment-vouchers" actions={can("paymentvouchers.create") && <Link href={`/w/${slug}/purchasing/vouchers/new`}><Button><Plus className="h-4 w-4" /> New voucher</Button></Link>} />
      <ListFilters search={search} setSearch={setSearch} status={status} setStatus={setStatus} statuses={Object.entries(PV_STATUS).map(([k, v]) => [k, v.label])} placeholder="Search number or supplier" />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="Nothing here yet" />
        ) : (
          <Table head={["Date", "Number", "Supplier", "Amount", "To pay", "Status"]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50">
                <Td className="whitespace-nowrap">{fmtDate(r.voucher_date)}</Td>
                <Td><Link href={`/w/${slug}/purchasing/vouchers/${r.id}`} className="font-mono text-xs font-medium hover:underline">{r.number}</Link></Td>
                <Td>{r.supplier_name}</Td>
                <Td className="text-right font-mono">{fmt(r.total)}</Td>
                <Td className="text-right font-mono">{fmt(r.net_payable)}</Td>
                <Td><Badge tone={PV_STATUS[r.status ?? "draft"].tone}>{PV_STATUS[r.status ?? "draft"].label}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
