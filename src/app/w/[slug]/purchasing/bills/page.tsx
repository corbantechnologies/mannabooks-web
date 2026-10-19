"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ListFilters } from "@/components/doc-list";
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { BILL_STATUS } from "@/lib/api/purchasing";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function BillsPage() {
  const { slug, can } = useWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const list = useQuery({
    queryKey: ["bills", slug, search, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/bills/", {
      params: { path: { workspace: slug }, query: { search: search || undefined, status: (status || undefined) as never, page_size: 100 } },
    })),
  });
  const rows = list.data?.results ?? [];
  void Badge; void fmt; void fmtDate; void ListFilters; void Input; void status; void setStatus;
  return (
    <div className="max-w-6xl">
      <PageHeader title="Bills" description="Supplier invoices: what you owe. Posting a bill records the payable and the input VAT you can claim." guide="bills" actions={can("bills.create") && <Link href={`/w/${slug}/purchasing/bills/new`}><Button><Plus className="h-4 w-4" /> Enter bill</Button></Link>} />
      <ListFilters search={search} setSearch={setSearch} status={status} setStatus={setStatus} statuses={Object.entries(BILL_STATUS).map(([k, v]) => [k, v.label])} placeholder="Search supplier or invoice number" />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="Nothing here yet" />
        ) : (
          <Table head={["Date", "Supplier", "Their invoice", "Due", "Total", "Balance", "Status"]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50">
                <Td className="whitespace-nowrap">{fmtDate(r.bill_date)}</Td>
                <Td>{r.supplier_name}</Td>
                <Td><Link href={`/w/${slug}/purchasing/bills/${r.id}`} className="font-mono text-xs font-medium hover:underline">{r.supplier_invoice_number || "Draft"}</Link></Td>
                <Td className={r.is_overdue ? "font-medium text-red-600" : ""}>{fmtDate(r.due_date)}</Td>
                <Td className="text-right font-mono">{fmt(r.total)}</Td>
                <Td className="text-right font-mono">{fmt(r.balance_due)}</Td>
                <Td><Badge tone={BILL_STATUS[r.status ?? "draft"].tone}>{BILL_STATUS[r.status ?? "draft"].label}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
