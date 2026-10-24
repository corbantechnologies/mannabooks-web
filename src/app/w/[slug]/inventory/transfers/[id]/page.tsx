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
import { ask } from "@/components/confirm";

export default function TransferPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const path = { params: { path: { workspace: slug, id } } };
  const t = useQuery({ queryKey: ["stock-transfer", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/stock-transfers/{id}/", path)) });
  const voidIt = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/stock-transfers/{id}/void/", path)),
    onSuccess: () => toast.success("Transfer voided; stock moved back"), onError: (e) => toast.error(e.message),
  });
  if (t.isLoading) return <Spinner />;
  if (t.error) return <ErrorState error={t.error} />;
  const d = t.data!;
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/inventory/transfers`} className="text-sm text-stone-500 hover:underline">&larr; Transfers</Link>
      <PageHeader title={`Transfer ${d.number}`} description={`${d.from_warehouse_name} → ${d.to_warehouse_name}`} guide="inventory"
        actions={d.status === "posted" && can("inventory.manage") && <Button variant="ghost" className="text-red-600" onClick={() => void ask("Move the stock back?").then((ok) => ok && voidIt.mutate())}>Void</Button>} />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-3">
        <Meta label="Date">{fmtDate(d.transfer_date)}</Meta><Meta label="Value">{fmt(d.total_value)}</Meta><Meta label="Status">{d.status === "void" ? <Badge>Void</Badge> : <Badge tone="green">Moved</Badge>}</Meta>
      </Card>
      <Card><Table head={["Product", "Qty", "Unit cost"]}>{d.lines.map((l) => <tr key={l.id}><Td>{l.product_name}</Td><Td className="text-right font-mono">{Number(l.quantity)} {l.unit}</Td><Td className="text-right font-mono">{fmt(l.unit_cost)}</Td></tr>)}</Table></Card>
    </div>
  );
}
