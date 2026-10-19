"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import toast from "react-hot-toast";

import { StockRow, StockRowsEditor } from "@/components/stock-lines";
import { Button, Card, Field, FormError, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { ADJUST_REASONS, useWarehouses } from "@/lib/api/purchasing";
import { todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

function NewAdjustment() {
  const { slug } = useWorkspace();
  const router = useRouter();
  const warehouses = useWarehouses(slug);
  const [head, setHead] = useState({ warehouse_id: "", adjustment_date: todayIso(), reason: useSearchParams().get("reason") ?? "damaged", notes: "" });
  const [rows, setRows] = useState<StockRow[]>([{ product_id: "", quantity: "" }]);
  const opening = head.reason === "opening";
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/stock-adjustments/", {
      ...wsPath(slug), body: { ...head, warehouse_id: head.warehouse_id || warehouses.data?.results[0]?.id,
        lines: rows.filter((r) => r.product_id).map((r) => ({ product_id: r.product_id, quantity: r.quantity, unit_cost: r.unit_cost || null })) } as never,
    })),
    onSuccess: (a) => { toast.success(`${a.number} posted`); router.push(`/w/${slug}/inventory/adjustments/${a.id}`); },
  });
  const set = (key: keyof typeof head) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setHead((p) => ({ ...p, [key]: e.target.value }));
  return (
    <div className="max-w-4xl">
      <Link href={`/w/${slug}/inventory/adjustments`} className="text-sm text-stone-500 hover:underline">&larr; Adjustments</Link>
      <PageHeader title={opening ? "Opening stock" : "Adjust stock"} guide="inventory"
        description={opening ? "What you have on the day you start, at what it cost you. It is posted against Opening balance equity." : "Enter a negative quantity to remove stock (damaged, lost), positive to add it (found)."} />
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Card className="grid gap-3 p-4 sm:grid-cols-3">
          <Field label="Warehouse"><Select value={head.warehouse_id || warehouses.data?.results[0]?.id || ""} onChange={set("warehouse_id")}>{(warehouses.data?.results ?? []).filter((w) => w.is_active).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Field>
          <Field label="Reason"><Select value={head.reason} onChange={set("reason")}>{ADJUST_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</Select></Field>
          <Field label="Date"><Input type="date" required value={head.adjustment_date} onChange={set("adjustment_date")} /></Field>
        </Card>
        <StockRowsEditor slug={slug} rows={rows} setRows={setRows} cost qtyHint={opening ? "Qty on hand" : "Qty (+ add, - remove)"} />
        <Field label="Notes"><Textarea rows={2} value={head.notes} onChange={set("notes")} /></Field>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button><Button type="submit" loading={save.isPending}>Post</Button></div>
      </form>
    </div>
  );
}

export default function NewAdjustmentPage() {
  return <Suspense><NewAdjustment /></Suspense>;
}
