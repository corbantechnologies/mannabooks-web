"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Meta } from "@/components/document-view";
import { Badge, Button, Card, ErrorState, FormError, Input, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { MO_STATUS } from "@/lib/api/purchasing";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function ProductionOrderPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const path = { params: { path: { workspace: slug, id } } };
  const order = useQuery({ queryKey: ["production-order", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/production-orders/{id}/", path)) });
  const [used, setUsed] = useState<Record<string, string>>({});
  const act = useMutation({
    mutationFn: async (action: "complete" | "cancel") => unwrap(await api.POST("/api/v1/w/{workspace}/production-orders/{id}/action/", {
      ...path, body: { action, usage: Object.entries(used).map(([component_id, quantity]) => ({ component_id, quantity })) } as never,
    })),
    onSuccess: (o) => toast.success(o.status === "completed" ? `Made ${Number(o.quantity)} at ${fmt(o.unit_cost)} each` : "Cancelled"),
  });
  if (order.isLoading) return <Spinner />;
  if (order.error) return <ErrorState error={order.error} />;
  const o = order.data!;
  const planned = o.status === "planned" && can("manufacturing.manage");
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/manufacturing/production`} className="text-sm text-stone-500 hover:underline">&larr; Production</Link>
      <PageHeader title={`Production ${o.number}`} description={`${Number(o.quantity)} × ${o.product_name}`} guide="manufacturing"
        actions={planned && (
          <div className="flex gap-2">
            <Button variant="ghost" className="text-red-600" onClick={() => confirm("Cancel this order?") && act.mutate("cancel")}>Cancel</Button>
            <Button loading={act.isPending} onClick={() => act.mutate("complete")}>Complete</Button>
          </div>
        )} />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-4">
        <Meta label="Status"><Badge tone={MO_STATUS[o.status ?? "planned"].tone}>{MO_STATUS[o.status ?? "planned"].label}</Badge></Meta>
        <Meta label="Date">{fmtDate(o.production_date)}</Meta>
        <Meta label="Warehouse">{o.warehouse_name}</Meta>
        {o.status === "completed" && <Meta label="Cost">{fmt(o.total_cost)} ({fmt(o.unit_cost)} each)</Meta>}
      </Card>
      <FormError error={act.error} />
      <Card>
        <Table head={["Component", planned ? "Used (change if different)" : "Used", "Unit cost", "Value"]}>
          {o.lines.map((l) => (
            <tr key={l.component_id}>
              <Td>{l.component_name}</Td>
              <Td className="w-48">{planned ? <Input inputMode="decimal" className="text-right" value={used[l.component_id] ?? String(Number(l.quantity))} onChange={(e) => setUsed((p) => ({ ...p, [l.component_id]: e.target.value }))} /> : <span className="font-mono">{Number(l.quantity)} {l.unit}</span>}</Td>
              <Td className="text-right font-mono">{o.status === "completed" ? fmt(l.unit_cost) : ""}</Td>
              <Td className="text-right font-mono">{o.status === "completed" ? fmt(l.value) : ""}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
