"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { DealForm } from "@/components/deal-form";
import { Button, Card, ErrorState, PageHeader, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { STAGES } from "@/lib/api/crm";
import type { Deal } from "@/lib/api/types";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

const OPEN = STAGES.filter(([k]) => k !== "won" && k !== "lost");

export default function PipelinePage() {
  const { slug, can, context } = useWorkspace();
  const [mine, setMine] = useState(false);
  const [adding, setAdding] = useState(false);
  const summary = useQuery({
    queryKey: ["pipeline", slug, mine],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/deals/pipeline/", { params: { path: { workspace: slug }, query: (mine ? { mine: "true" } : {}) as never } })),
  });
  const deals = useQuery({
    queryKey: ["deals", slug, "open"],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/deals/", { params: { path: { workspace: slug }, query: { stage__in: OPEN.map(([k]) => k).join(","), page_size: 200 } as never } })),
  });
  const move = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) =>
      unwrap(await api.POST("/api/v1/w/{workspace}/deals/{id}/move/", { params: { path: { workspace: slug, id } }, body: { stage: stage as never } })),
    onSuccess: (d) => toast.success(`${d.title}: ${STAGES.find(([k]) => k === d.stage)?.[1]}`),
    onError: (e) => toast.error(e.message),
  });
  const s = summary.data;
  const manage = can("crm.manage");
  const rows = (deals.data?.results ?? []).filter((d: Deal) => !mine || d.assigned_to_id === context.membership_id);
  return (
    <div className="w-full">
      <PageHeader title="Pipeline" description="Every open deal by stage. Move a deal along as it progresses; won and lost close it." guide="crm"
        actions={<div className="flex gap-2">
          <label className="flex items-center gap-2 text-sm text-stone-600"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> My deals</label>
          {manage && <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> New deal</Button>}
        </div>} />
      {summary.isLoading ? <Spinner /> : summary.error ? <ErrorState error={summary.error} /> : s && (
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          <Card className="p-4"><p className="text-xs uppercase text-stone-500">Open pipeline</p><p className="mt-1 font-mono text-xl font-semibold">{fmt(s.open_value)}</p></Card>
          <Card className="p-4"><p className="text-xs uppercase text-stone-500">Likely (weighted)</p><p className="mt-1 font-mono text-xl font-semibold">{fmt(s.weighted_value)}</p></Card>
          <Card className="p-4"><p className="text-xs uppercase text-stone-500">Won this month</p><p className="mt-1 font-mono text-xl font-semibold text-brand-700">{fmt(s.won_this_month)}</p></Card>
          <Card className="p-4"><p className="text-xs uppercase text-stone-500">Win rate this month</p><p className="mt-1 font-mono text-xl font-semibold">{s.win_rate != null ? `${Number(s.win_rate)}%` : "-"}</p></Card>
        </div>
      )}
      {deals.isLoading ? <Spinner /> : (
        <div className="grid gap-3 overflow-x-auto pb-2 md:grid-cols-4">
          {OPEN.map(([key, label]) => {
            const col = rows.filter((d) => d.stage === key);
            const stat = s?.stages.find((x) => x.stage === key);
            return (
              <div key={key} className="min-w-56 rounded-lg bg-stone-100 p-2">
                <div className="flex items-baseline justify-between px-1 pb-2">
                  <p className="text-sm font-semibold text-stone-800">{label} <span className="font-normal text-stone-500">{col.length}</span></p>
                  <p className="font-mono text-xs text-stone-500">{fmt(stat?.value ?? 0)}</p>
                </div>
                <div className="space-y-2">
                  {col.map((d) => (
                    <Card key={d.id} className="p-3 text-sm">
                      <Link href={`/w/${slug}/crm/deals/${d.id}`} className="font-medium text-stone-900 hover:underline">{d.title}</Link>
                      <p className="text-xs text-stone-500">{d.customer_name ?? d.lead_name}</p>
                      <p className="mt-1 flex justify-between text-xs"><span className="font-mono">{fmt(d.value)}</span><span className="text-stone-500">{d.expected_close_date ? fmtDate(d.expected_close_date) : ""}</span></p>
                      {manage && (
                        <select aria-label="Move to" className="mt-2 w-full rounded border border-stone-200 bg-white px-1 py-0.5 text-xs" value={d.stage}
                          onChange={(e) => e.target.value === "lost" ? (window.location.href = `/w/${slug}/crm/deals/${d.id}?lose=1`) : move.mutate({ id: d.id, stage: e.target.value })}>
                          {STAGES.map(([k, l]) => <option key={k} value={k}>{k === d.stage ? `Stage: ${l}` : `Move to ${l}`}</option>)}
                        </select>
                      )}
                    </Card>
                  ))}
                  {col.length === 0 && <p className="px-1 py-3 text-center text-xs text-stone-400">No deals</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {adding && <DealForm open onClose={() => setAdding(false)} />}
    </div>
  );
}
