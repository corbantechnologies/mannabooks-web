"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

const STATUS_TONE = { draft: "amber", posted: "green", reversed: "stone" } as const;

export default function JournalsPage() {
  const { slug, can } = useWorkspace();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const list = useQuery({
    queryKey: ["journals", slug, status, search],
    queryFn: async () =>
      unwrap(await api.GET("/api/v1/w/{workspace}/journals/", {
        params: { path: { workspace: slug }, query: { status: (status || undefined) as "draft" | "posted" | "reversed" | undefined, search: search || undefined } },
      })),
  });
  const rows = list.data?.results ?? [];

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Journal entries"
        description="Every entry in the books. Most come from sales, purchases and payroll; record anything else here as a manual entry."
        guide="journal-entries"
        actions={can("journals.create") && <Link href={`/w/${slug}/accounting/journals/new`}><Button><Plus className="h-4 w-4" /> New entry</Button></Link>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Select className="max-w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All entries</option><option value="draft">Drafts</option><option value="posted">Posted</option><option value="reversed">Reversed</option>
        </Select>
        <Input className="max-w-xs" placeholder="Search number or description" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="No journal entries yet" />
        ) : (
          <Table head={["Date", "Number", "Description", "Source", "Amount", "Status"]}>
            {rows.map((j) => (
              <tr key={j.id} className="hover:bg-stone-50">
                <Td className="whitespace-nowrap">{fmtDate(j.entry_date)}</Td>
                <Td className="font-mono text-xs">{j.number || "-"}</Td>
                <Td><Link href={`/w/${slug}/accounting/journals/${j.id}`} className="font-medium hover:underline">{j.description}</Link></Td>
                <Td className="text-stone-500">{j.source.replace("_", " ")}</Td>
                <Td className="text-right font-mono">{fmt(j.total)}</Td>
                <Td><Badge tone={STATUS_TONE[j.status]}>{j.status}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
