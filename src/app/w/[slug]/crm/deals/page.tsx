"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DealForm } from "@/components/deal-form";
import { ListFilters } from "@/components/doc-list";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { STAGES, stageLabel } from "@/lib/api/crm";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function DealsPage() {
  const { slug, can } = useWorkspace();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [adding, setAdding] = useState(false);
  const list = useQuery({
    queryKey: ["deals", slug, search, stage],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/deals/", {
      params: { path: { workspace: slug }, query: { search: search || undefined, stage: (stage || undefined) as never, page_size: 100 } },
    })),
  });
  const rows = list.data?.results ?? [];
  return (
    <div className="w-full">
      <PageHeader title="Deals" description="Sales being worked on, with their value, chance and expected close date." guide="crm"
        actions={can("crm.manage") && <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> New deal</Button>} />
      <ListFilters search={search} setSearch={setSearch} status={stage} setStatus={setStage} statuses={STAGES} placeholder="Search deal or customer" />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="No deals here" />
        ) : (
          <Table head={["Deal", "Customer", "Stage", "Value", "Chance", "Closes", "With"]}>
            {rows.map((d) => (
              <tr key={d.id} className="hover:bg-stone-50">
                <Td><Link href={`/w/${slug}/crm/deals/${d.id}`} className="font-medium hover:underline">{d.title}</Link><div className="text-xs text-stone-500">{d.number}</div></Td>
                <Td className="text-stone-600">{d.customer_name ?? d.lead_name ?? "-"}</Td>
                <Td><Badge tone={d.stage === "won" ? "green" : d.stage === "lost" ? "stone" : "blue"}>{stageLabel(d.stage)}</Badge></Td>
                <Td className="text-right font-mono">{fmt(d.value)}</Td>
                <Td className="text-right">{d.chance}%</Td>
                <Td className="text-stone-600">{d.closed_at ? fmtDate(d.closed_at) : d.expected_close_date ? fmtDate(d.expected_close_date) : "-"}</Td>
                <Td className="text-stone-600">{d.assigned_to_name ?? "-"}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {adding && <DealForm open onClose={() => setAdding(false)} />}
    </div>
  );
}
