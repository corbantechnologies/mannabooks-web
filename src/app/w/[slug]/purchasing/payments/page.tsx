"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ListFilters } from "@/components/doc-list";
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { POSTED_STATUS } from "@/lib/api/purchasing";
import { fmt, fmtDate } from "@/lib/format";
import { useDateQuery } from "@/lib/period";
import { useWorkspace } from "@/lib/workspace";

export default function SupplierPaymentsPage() {
  const { slug, can } = useWorkspace();
  const dates = useDateQuery("payment_date");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const list = useQuery({
    queryKey: [dates,"supplier-payments", slug, search, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/supplier-payments/", {
      params: { path: { workspace: slug }, query: { ...dates, search: search || undefined, status: (status || undefined) as never, page_size: 100 } },
    })),
  });
  const rows = list.data?.results ?? [];
  void Badge; void fmt; void fmtDate; void ListFilters; void Input; void status; void setStatus;
  return (
    <div className="w-full">
      <PageHeader title="Supplier payments" description="Money paid to suppliers. Most are made from approved payment vouchers." guide="supplier-payments" actions={can("supplierpayments.create") && <Link href={`/w/${slug}/purchasing/payments/new`}><Button><Plus className="h-4 w-4" /> Record payment</Button></Link>} />
      <ListFilters search={search} setSearch={setSearch} status={status} setStatus={setStatus} statuses={Object.entries(POSTED_STATUS).map(([k, v]) => [k, v.label])} placeholder="Search number or supplier" />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="Nothing here yet" />
        ) : (
          <Table head={["Date", "Number", "Supplier", "Reference", "Paid", "Withheld", ""]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50">
                <Td className="whitespace-nowrap">{fmtDate(r.payment_date)}</Td>
                <Td><Link href={`/w/${slug}/purchasing/payments/${r.id}`} className="font-mono text-xs font-medium hover:underline">{r.number}</Link></Td>
                <Td>{r.supplier_name}</Td>
                <Td className="font-mono text-xs">{r.reference || "-"}</Td>
                <Td className="text-right font-mono">{fmt(r.amount)}</Td>
                <Td className="text-right font-mono">{Number(r.withholding_amount) ? fmt(r.withholding_amount) : ""}</Td>
                <Td>{r.status === "void" && <Badge tone={POSTED_STATUS.void.tone}>Void</Badge>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
