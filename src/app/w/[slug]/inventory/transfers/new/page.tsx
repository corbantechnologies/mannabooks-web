"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { StockRow, StockRowsEditor } from "@/components/stock-lines";
import { Button, Card, Field, FormError, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWarehouses } from "@/lib/api/purchasing";
import { todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function NewTransferPage() {
  const { slug } = useWorkspace();
  const router = useRouter();
  const warehouses = useWarehouses(slug);
  const active = (warehouses.data?.results ?? []).filter((w) => w.is_active);
  const [head, setHead] = useState({ from_warehouse_id: "", to_warehouse_id: "", transfer_date: todayIso(), notes: "" });
  const [rows, setRows] = useState<StockRow[]>([{ product_id: "", quantity: "1" }]);
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/stock-transfers/", {
      ...wsPath(slug), body: { ...head, lines: rows.filter((r) => r.product_id).map((r) => ({ product_id: r.product_id, quantity: r.quantity })) } as never,
    })),
    onSuccess: (t) => { toast.success(`${t.number}: stock moved`); router.push(`/w/${slug}/inventory/transfers/${t.id}`); },
  });
  const set = (key: keyof typeof head) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setHead((p) => ({ ...p, [key]: e.target.value }));
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/inventory/transfers`} className="text-sm text-stone-500 hover:underline">&larr; Transfers</Link>
      <PageHeader title="Move stock" guide="inventory" />
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Card className="grid gap-3 p-4 sm:grid-cols-3">
          <Field label="From"><Select required value={head.from_warehouse_id} onChange={set("from_warehouse_id")}><option value="">Choose</option>{active.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Field>
          <Field label="To"><Select required value={head.to_warehouse_id} onChange={set("to_warehouse_id")}><option value="">Choose</option>{active.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Field>
          <Field label="Date"><Input type="date" required value={head.transfer_date} onChange={set("transfer_date")} /></Field>
        </Card>
        <StockRowsEditor slug={slug} rows={rows} setRows={setRows} />
        <Field label="Notes"><Textarea rows={2} value={head.notes} onChange={set("notes")} /></Field>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button><Button type="submit" loading={save.isPending}>Move stock</Button></div>
      </form>
    </div>
  );
}
