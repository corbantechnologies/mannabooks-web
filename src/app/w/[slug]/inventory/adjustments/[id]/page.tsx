"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";

import { Meta } from "@/components/document-view";
import { Badge, Button, Card, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function AdjustmentPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const path = { params: { path: { workspace: slug, id } } };
  const a = useQuery({ queryKey: ["stock-adjustment", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/stock-adjustments/{id}/", path)) });
  const voidIt = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/stock-adjustments/{id}/void/", path)),
    onSuccess: () => toast.success("Adjustment voided"), onError: (e) => toast.error(e.message),
  });
  if (a.isLoading) return <Spinner />;
  if (a.error) return <ErrorState error={a.error} />;
  const d = a.data!;
  return (
    <div className="max-w-4xl">
      <Link href={`/w/${slug}/inventory/adjustments`} className="text-sm text-stone-500 hover:underline">&larr; Adjustments</Link>
      <PageHeader title={`${d.reason_label} ${d.number}`} description={d.warehouse_name} guide="inventory"
        actions={d.status === "posted" && can("inventory.manage") && <Button variant="ghost" className="text-red-600" onClick={() => confirm("Undo this adjustment?") && voidIt.mutate()}>Void</Button>} />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-3">
        <Meta label="Date">{fmtDate(d.adjustment_date)}</Meta><Meta label="Value">{fmt(d.total_value)}</Meta><Meta label="Status">{d.status === "void" ? <Badge>Void</Badge> : <Badge tone="green">Posted</Badge>}</Meta>
        {d.notes && <Meta label="Notes">{d.notes}</Meta>}
      </Card>
      <Card><Table head={["Product", "Qty", "Unit cost", "Value"]}>{d.lines.map((l) => <tr key={l.id}><Td>{l.product_name}</Td><Td className="text-right font-mono">{Number(l.quantity)} {l.unit}</Td><Td className="text-right font-mono">{fmt(l.unit_cost)}</Td><Td className="text-right font-mono">{fmt(l.value)}</Td></tr>)}</Table></Card>
    </div>
  );
}
