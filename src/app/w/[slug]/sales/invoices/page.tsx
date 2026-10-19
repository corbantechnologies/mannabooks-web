"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ListFilters } from "@/components/doc-list";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { INVOICE_STATUS } from "@/lib/api/sales";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

type Status = keyof typeof INVOICE_STATUS;

export default function InvoicesPage() {
  const { slug, can } = useWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const list = useQuery({
    queryKey: ["invoices", slug, search, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/invoices/", {
      params: { path: { workspace: slug }, query: { kind: "invoice", search: search || undefined, status: (status || undefined) as Status | undefined, page_size: 100 } },
    })),
  });
  const rows = list.data?.results ?? [];

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Invoices"
        description="Sales on credit. Drafts can be changed; issuing numbers the invoice, posts it to the books and sends it to KRA eTIMS when signing is on."
        guide="invoices"
        actions={can("invoices.create") && <Link href={`/w/${slug}/sales/invoices/new`}><Button><Plus className="h-4 w-4" /> New invoice</Button></Link>}
      />
      <ListFilters search={search} setSearch={setSearch} status={status} setStatus={setStatus} statuses={Object.entries(INVOICE_STATUS).map(([k, v]) => [k, v.label])} />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="No invoices found" />
        ) : (
          <Table head={["Date", "Number", "Customer", "Due", "Total", "Balance", "Status"]}>
            {rows.map((i) => (
              <tr key={i.id} className="hover:bg-stone-50">
                <Td className="whitespace-nowrap">{fmtDate(i.issue_date)}</Td>
                <Td><Link href={`/w/${slug}/sales/invoices/${i.id}`} className="font-mono text-xs font-medium hover:underline">{i.number || "Draft"}</Link></Td>
                <Td>{i.customer_name}</Td>
                <Td className={`whitespace-nowrap ${i.is_overdue ? "font-medium text-red-600" : ""}`}>{fmtDate(i.due_date)}</Td>
                <Td className="text-right font-mono">{fmt(i.total)}</Td>
                <Td className="text-right font-mono">{fmt(i.balance_due)}</Td>
                <Td>
                  <Badge tone={INVOICE_STATUS[i.status].tone}>{INVOICE_STATUS[i.status].label}</Badge>
                  {i.is_overdue && <span className="ml-1"><Badge tone="red">Overdue</Badge></span>}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
