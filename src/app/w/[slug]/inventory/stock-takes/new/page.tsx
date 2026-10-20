"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, Field, FormError, Input, PageHeader, Select } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWarehouses } from "@/lib/api/purchasing";
import { useCategories } from "@/lib/api/sales";
import { todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function NewStockTakePage() {
  const { slug } = useWorkspace();
  const router = useRouter();
  const warehouses = useWarehouses(slug);
  const categories = useCategories(slug);
  const [form, setForm] = useState({ warehouse_id: "", category_id: "", count_date: todayIso() });
  const start = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/stock-takes/", {
      ...wsPath(slug), body: { ...form, warehouse_id: form.warehouse_id || warehouses.data?.results[0]?.id, category_id: form.category_id || null } as never,
    })),
    onSuccess: (t) => { toast.success("Count sheet ready"); router.push(`/w/${slug}/inventory/stock-takes/${t.id}`); },
  });
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/inventory/stock-takes`} className="text-sm text-stone-500 hover:underline">&larr; Stock takes</Link>
      <PageHeader title="Start a stock take" description="MannaBooks lists every stock product with what the books say. Count, enter the numbers, then post." guide="stock-takes" />
      <Card className="p-5">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start.mutate(); }}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Warehouse"><Select value={form.warehouse_id || warehouses.data?.results[0]?.id || ""} onChange={(e) => setForm((p) => ({ ...p, warehouse_id: e.target.value }))}>{(warehouses.data?.results ?? []).filter((w) => w.is_active).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Field>
            <Field label="Only this category"><Select value={form.category_id} onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}><option value="">Everything</option>{(categories.data?.results ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Count date"><Input type="date" value={form.count_date} onChange={(e) => setForm((p) => ({ ...p, count_date: e.target.value }))} /></Field>
          </div>
          <FormError error={start.error} />
          <Button type="submit" loading={start.isPending}>Start counting</Button>
        </form>
      </Card>
    </div>
  );
}
