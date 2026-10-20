"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ListFilters } from "@/components/doc-list";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { QUOTE_STATUS } from "@/lib/api/sales";
import { fmt, fmtDate } from "@/lib/format";
import { useDateQuery } from "@/lib/period";
import { useWorkspace } from "@/lib/workspace";

type Status = keyof typeof QUOTE_STATUS;

export default function QuotationsPage() {
  const { slug, can } = useWorkspace();
  const dates = useDateQuery("issue_date");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const list = useQuery({
    queryKey: [dates,"quotations", slug, search, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/quotations/", {
      params: { path: { workspace: slug }, query: { ...dates, search: search || undefined, status: (status || undefined) as Status | undefined, page_size: 100 } },
    })),
  });
  const rows = list.data?.results ?? [];
  return (
    <div className="w-full">
      <PageHeader
        title="Quotations"
        description="Price offers. Nothing is posted to the books; turn an accepted quotation into an invoice with one click."
        guide="quotations"
        actions={can("quotations.manage") && <Link href={`/w/${slug}/sales/quotations/new`}><Button><Plus className="h-4 w-4" /> New quotation</Button></Link>}
      />
      <ListFilters search={search} setSearch={setSearch} status={status} setStatus={setStatus} statuses={Object.entries(QUOTE_STATUS).map(([k, v]) => [k, v.label])} />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="No quotations found" />
        ) : (
          <Table head={["Date", "Number", "Customer", "Valid until", "Total", "Status"]}>
            {rows.map((q) => (
              <tr key={q.id} className="hover:bg-stone-50">
                <Td className="whitespace-nowrap">{fmtDate(q.issue_date)}</Td>
                <Td><Link href={`/w/${slug}/sales/quotations/${q.id}`} className="font-mono text-xs font-medium hover:underline">{q.number}</Link></Td>
                <Td>{q.customer_name}</Td>
                <Td className={q.is_expired ? "text-red-600" : ""}>{fmtDate(q.valid_until)}</Td>
                <Td className="text-right font-mono">{fmt(q.total)}</Td>
                <Td><Badge tone={QUOTE_STATUS[q.status].tone}>{QUOTE_STATUS[q.status].label}</Badge>{q.is_expired && <span className="ml-1"><Badge tone="red">Expired</Badge></span>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
