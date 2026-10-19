"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";

import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { FREQUENCIES, RECURRING_STATUS } from "@/lib/api/sales";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function RecurringInvoicesPage() {
  const { slug, can } = useWorkspace();
  const list = useQuery({
    queryKey: ["recurring-invoices", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/recurring-invoices/", { params: { path: { workspace: slug }, query: { page_size: 200 } } })),
  });
  const rows = list.data?.results ?? [];
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Recurring invoices"
        description="Invoices raised automatically on a schedule: rent, retainers, service contracts. MannaBooks raises them each morning."
        guide="recurring-invoices"
        actions={can("recurringinvoices.manage") && <Link href={`/w/${slug}/sales/recurring-invoices/new`}><Button><Plus className="h-4 w-4" /> New schedule</Button></Link>}
      />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="No recurring invoices yet" />
        ) : (
          <Table head={["Name", "Customer", "Every", "Next invoice", "Raised", "Status"]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50">
                <Td><Link href={`/w/${slug}/sales/recurring-invoices/${r.id}`} className="font-medium hover:underline">{r.name}</Link>{r.last_error && <div className="text-xs text-red-600">{r.last_error}</div>}</Td>
                <Td>{r.customer_name}</Td>
                <Td>{FREQUENCIES[r.frequency ?? "monthly"]}</Td>
                <Td>{r.status === "ended" ? "-" : fmtDate(r.next_run_date)}</Td>
                <Td className="text-right">{r.invoices_created}</Td>
                <Td><Badge tone={RECURRING_STATUS[r.status].tone}>{RECURRING_STATUS[r.status].label}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
