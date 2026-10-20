"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { RelatedDocuments } from "@/components/related-documents";
import { Meta } from "@/components/document-view";
import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function GoodsReceiptPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const path = { params: { path: { workspace: slug, id } } };
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const grn = useQuery({ queryKey: ["goods-receipt", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/goods-receipts/{id}/", path)) });
  const voidIt = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/goods-receipts/{id}/void/", { ...path, body: { reason } })),
    onSuccess: () => { toast.success("Delivery voided; stock taken back out"); setVoiding(false); },
  });
  if (grn.isLoading) return <Spinner />;
  if (grn.error) return <ErrorState error={grn.error} />;
  const g = grn.data!;
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/purchasing/receipts`} className="text-sm text-stone-500 hover:underline">&larr; Goods received</Link>
      <PageHeader title={`Goods received ${g.number}`} description={g.supplier_name} guide="goods-received"
        actions={g.status === "posted" && (
          <div className="flex gap-2">
            {can("goodsreceipts.manage") && <Button variant="ghost" className="text-red-600" onClick={() => { voidIt.reset(); setVoiding(true); }}>Void</Button>}
            {!g.is_billed && can("bills.create") && <Link href={`/w/${slug}/purchasing/bills/new?receipt=${g.id}`}><Button>Enter their bill</Button></Link>}
          </div>
        )} />
      <RelatedDocuments kind="goods_receipt" id={id} />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-4">
        <Meta label="Status">{g.status === "void" ? <Badge>Void: {g.void_reason}</Badge> : g.is_billed ? <Badge tone="green">Billed</Badge> : <Badge tone="amber">Waiting for the bill</Badge>}</Meta>
        <Meta label="Date">{fmtDate(g.receipt_date)}</Meta>
        <Meta label="Order">{g.purchase_order_id ? <Link className="font-mono text-xs hover:underline" href={`/w/${slug}/purchasing/orders/${g.purchase_order_id}`}>{g.purchase_order_number}</Link> : "-"}</Meta>
        <Meta label="Warehouse">{g.warehouse_name}</Meta>
        {g.delivery_note_number && <Meta label="Their delivery note">{g.delivery_note_number}</Meta>}
      </Card>
      <Card>
        <Table head={["Item", "Qty", "Unit cost", "Value", "Billed", "Stock"]}>
          {g.lines.map((l) => (
            <tr key={l.id}>
              <Td>{l.description}</Td><Td className="text-right font-mono">{Number(l.quantity)}</Td><Td className="text-right font-mono">{fmt(l.unit_cost)}</Td>
              <Td className="text-right font-mono">{fmt(l.value)}</Td><Td className="text-right">{Number(l.billed_quantity)}</Td><Td>{l.stocked ? "Into stock" : "Not tracked"}</Td>
            </tr>
          ))}
          <tr className="bg-stone-50 font-semibold"><Td colSpan={3}>Total (before VAT)</Td><Td className="text-right font-mono">{fmt(g.total_value)}</Td><Td colSpan={2}>{""}</Td></tr>
        </Table>
      </Card>
      <Modal open={voiding} title={`Void ${g.number}`} onClose={() => setVoiding(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); voidIt.mutate(); }}>
          <p className="text-sm text-stone-600">The stock is taken back out. Only possible before the supplier&apos;s bill is entered, and while the stock is still there.</p>
          <Field label="Reason"><Input required value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <FormError error={voidIt.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setVoiding(false)}>Cancel</Button><Button type="submit" variant="danger" loading={voidIt.isPending}>Void</Button></div>
        </form>
      </Modal>
    </div>
  );
}
