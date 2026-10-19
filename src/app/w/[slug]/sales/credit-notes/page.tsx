"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ListFilters } from "@/components/doc-list";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function CreditNotesPage() {
  const { slug, can } = useWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const list = useQuery({
    queryKey: ["credit-notes", slug, search, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/credit-notes/", {
      params: { path: { workspace: slug }, query: { search: search || undefined, status: (status || undefined) as "issued" | "void" | undefined, page_size: 100 } },
    })),
  });
  const rows = list.data?.results ?? [];
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Credit notes"
        description="Reduce what a customer owes for returned goods, overcharges or discounts given after the sale."
        guide="credit-notes"
        actions={can("creditnotes.create") && <Link href={`/w/${slug}/sales/credit-notes/new`}><Button><Plus className="h-4 w-4" /> New credit note</Button></Link>}
      />
      <ListFilters search={search} setSearch={setSearch} status={status} setStatus={setStatus} statuses={[["issued", "Issued"], ["void", "Void"]]} />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="No credit notes found" />
        ) : (
          <Table head={["Date", "Number", "Customer", "Invoice", "Reason", "Total", ""]}>
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-stone-50">
                <Td className="whitespace-nowrap">{fmtDate(c.issue_date)}</Td>
                <Td><Link href={`/w/${slug}/sales/credit-notes/${c.id}`} className="font-mono text-xs font-medium hover:underline">{c.number}</Link></Td>
                <Td>{c.customer_name}</Td>
                <Td className="font-mono text-xs">{c.invoice_number || "-"}</Td>
                <Td className="text-stone-600">{c.reason}</Td>
                <Td className="text-right font-mono">{fmt(c.total)}</Td>
                <Td>{c.status === "void" && <Badge>Void</Badge>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
