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

export default function OtherIncomePage() {
  const { slug, can } = useWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const list = useQuery({
    queryKey: ["other-income", slug, search, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/other-income/", {
      params: { path: { workspace: slug }, query: { search: search || undefined, page_size: 100 } },
    })),
  });
  const rows = list.data?.results ?? [];
  void Badge; void fmt; void fmtDate; void ListFilters; void Input; void status; void setStatus;
  return (
    <div className="max-w-6xl">
      <PageHeader title="Other income" description="Money received that isn't a sale: interest, rent received, commission, grants, refunds." guide="other-income" actions={can("banking.receive") && <Link href={`/w/${slug}/banking/income/new`}><Button><Plus className="h-4 w-4" /> Receive money</Button></Link>} />
      <div className="mb-4 max-w-sm"><Input placeholder="Search payer or reference" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="Nothing here yet" />
        ) : (
          <Table head={["Date", "Number", "From", "Into", "Amount", ""]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50">
                <Td className="whitespace-nowrap">{fmtDate(r.income_date)}</Td>
                <Td><Link href={`/w/${slug}/banking/income/${r.id}`} className="font-mono text-xs font-medium hover:underline">{r.number}</Link></Td>
                <Td>{r.payer || "-"}</Td>
                <Td>{r.received_into_name}</Td>
                <Td className="text-right font-mono">{fmt(r.total)}</Td>
                <Td>{r.status === "void" && <Badge>Void</Badge>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
