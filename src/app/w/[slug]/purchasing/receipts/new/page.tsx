"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, Field, FormError, Input, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useSuppliers, useWarehouses } from "@/lib/api/purchasing";
import { useProducts } from "@/lib/api/sales";
import type { PurchaseOrder } from "@/lib/api/types";
import { fmt, todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

function ReceiveForm({ order }: { order?: PurchaseOrder }) {
  const { slug } = useWorkspace();
  const router = useRouter();
  const suppliers = useSuppliers(slug);
  const warehouses = useWarehouses(slug);
  const products = useProducts(slug);
  const [head, setHead] = useState({ supplier_id: order?.supplier_id ?? "", warehouse_id: order?.warehouse_id ?? "", receipt_date: todayIso(), delivery_note_number: "", notes: "" });
  const outstanding = (order?.lines ?? []).map((l) => ({ line: l, left: Number(l.quantity) - Number((l as { received_quantity?: string }).received_quantity ?? 0) }));
  const [qty, setQty] = useState<Record<string, string>>(Object.fromEntries(outstanding.map(({ line, left }) => [line.id, String(Math.max(left, 0))])));
  const [direct, setDirect] = useState([{ product_id: "", quantity: "1", unit_cost: "" }]);
  const save = useMutation({
    mutationFn: async () => {
      const lines = order
        ? outstanding.filter(({ line }) => Number(qty[line.id]) > 0).map(({ line }) => ({ order_line_id: line.id, quantity: qty[line.id] }))
        : direct.filter((d) => d.product_id).map((d) => ({ product_id: d.product_id, quantity: d.quantity, ...(d.unit_cost ? { unit_cost: d.unit_cost } : {}) }));
      return unwrap(await api.POST("/api/v1/w/{workspace}/goods-receipts/", {
        ...wsPath(slug), body: { ...head, supplier_id: head.supplier_id || undefined, purchase_order_id: order?.id ?? null, warehouse_id: head.warehouse_id || null, lines } as never,
      }));
    },
    onSuccess: (g) => { toast.success(`${g.number} saved: stock updated`); router.push(`/w/${slug}/purchasing/receipts/${g.id}`); },
  });
  const set = (key: keyof typeof head) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setHead((p) => ({ ...p, [key]: e.target.value }));
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <Card className="grid gap-3 p-4 sm:grid-cols-4">
        {order ? <div className="text-sm sm:col-span-2"><p className="text-stone-500">Against order</p><p className="font-medium">{order.number} · {order.supplier_name}</p></div> : (
          <div className="sm:col-span-2">
            <Field label="Supplier"><Select required value={head.supplier_id} onChange={set("supplier_id")}><option value="">Choose a supplier</option>{(suppliers.data?.results ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          </div>
        )}
        <Field label="Received on"><Input type="date" required value={head.receipt_date} onChange={set("receipt_date")} /></Field>
        <Field label="Their delivery note no."><Input value={head.delivery_note_number} onChange={set("delivery_note_number")} /></Field>
        <Field label="Into warehouse">
          <Select value={head.warehouse_id} onChange={set("warehouse_id")}>
            <option value="">Default warehouse</option>
            {(warehouses.data?.results ?? []).filter((w) => w.is_active).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        </Field>
      </Card>
      <Card>
        {order ? (
          <Table head={["Item", "Ordered", "Received before", "Receiving now"]}>
            {outstanding.map(({ line, left }) => (
              <tr key={line.id}>
                <Td>{line.description}</Td>
                <Td className="text-right font-mono">{Number(line.quantity)}</Td>
                <Td className="text-right font-mono">{Number(line.quantity) - left}</Td>
                <Td className="w-36"><Input inputMode="decimal" className="text-right" disabled={left <= 0} value={qty[line.id] ?? ""} onChange={(e) => setQty((p) => ({ ...p, [line.id]: e.target.value }))} /></Td>
              </tr>
            ))}
          </Table>
        ) : (
          <>
            <Table head={["Product", "Qty", "Unit cost (before VAT)", ""]}>
              {direct.map((d, i) => (
                <tr key={i}>
                  <Td><Select value={d.product_id} onChange={(e) => {
                    const p = (products.data?.results ?? []).find((x) => x.id === e.target.value);
                    setDirect((prev) => prev.map((x, n) => (n === i ? { ...x, product_id: e.target.value, unit_cost: String(Number(p?.cost_price ?? 0)) } : x)));
                  }}><option value="">Choose a product</option>{(products.data?.results ?? []).filter((p) => p.kind === "goods").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Td>
                  <Td className="w-28"><Input inputMode="decimal" className="text-right" value={d.quantity} onChange={(e) => setDirect((prev) => prev.map((x, n) => (n === i ? { ...x, quantity: e.target.value } : x)))} /></Td>
                  <Td className="w-40"><Input inputMode="decimal" className="text-right" value={d.unit_cost} onChange={(e) => setDirect((prev) => prev.map((x, n) => (n === i ? { ...x, unit_cost: e.target.value } : x)))} /></Td>
                  <Td className="w-10"><button type="button" aria-label="Remove" className="text-stone-400 hover:text-red-600" onClick={() => setDirect((prev) => prev.filter((_, n) => n !== i))}><Trash2 className="h-4 w-4" /></button></Td>
                </tr>
              ))}
            </Table>
            <div className="px-3 py-2"><Button type="button" variant="ghost" className="px-2 py-1" onClick={() => setDirect((p) => [...p, { product_id: "", quantity: "1", unit_cost: "" }])}><Plus className="h-4 w-4" /> Add product</Button></div>
          </>
        )}
      </Card>
      {order && <p className="text-xs text-stone-500">Valued at the order&apos;s cost before VAT, {fmt(order.subtotal)} for the full order.</p>}
      <FormError error={save.error} />
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button><Button type="submit" loading={save.isPending}>Save delivery</Button></div>
    </form>
  );
}

function NewReceipt() {
  const { slug } = useWorkspace();
  const orderId = useSearchParams().get("order");
  const order = useQuery({
    queryKey: ["purchase-order", slug, orderId], enabled: Boolean(orderId),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/purchase-orders/{id}/", { params: { path: { workspace: slug, id: orderId! } } })),
  });
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/purchasing/receipts`} className="text-sm text-stone-500 hover:underline">&larr; Goods received</Link>
      <PageHeader title="Receive goods" description="Count what arrived. Saving puts stock items into the warehouse." guide="goods-received" />
      {orderId && order.isLoading ? <Spinner /> : <ReceiveForm order={order.data} />}
    </div>
  );
}

export default function NewReceiptPage() {
  return <Suspense><NewReceipt /></Suspense>;
}
