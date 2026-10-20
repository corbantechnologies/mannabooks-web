"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, Field, FormError, Input, PageHeader, Select } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWarehouses } from "@/lib/api/purchasing";
import { todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

function NewProduction() {
  const { slug } = useWorkspace();
  const router = useRouter();
  const boms = useQuery({ queryKey: ["boms", slug, "active"], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/bills-of-materials/", { params: { path: { workspace: slug }, query: { is_active: true } } })) });
  const warehouses = useWarehouses(slug);
  const [form, setForm] = useState({ bom_id: useSearchParams().get("recipe") ?? "", quantity: "", warehouse_id: "", production_date: todayIso(), notes: "" });
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/production-orders/", { ...wsPath(slug), body: { ...form, warehouse_id: form.warehouse_id || undefined } as never })),
    onSuccess: (o) => { toast.success(`${o.number} planned`); router.push(`/w/${slug}/manufacturing/production/${o.id}`); },
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p) => ({ ...p, [key]: e.target.value }));
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/manufacturing/production`} className="text-sm text-stone-500 hover:underline">&larr; Production</Link>
      <PageHeader title="New production order" guide="manufacturing" />
      <Card className="p-5">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Recipe"><Select required value={form.bom_id} onChange={set("bom_id")}><option value="">Choose</option>{(boms.data?.results ?? []).map((b) => <option key={b.id} value={b.id}>{b.product_name}{b.name ? ` (${b.name})` : ""}</option>)}</Select></Field>
            <Field label="Quantity to make"><Input required inputMode="decimal" value={form.quantity} onChange={set("quantity")} /></Field>
            <Field label="Warehouse"><Select value={form.warehouse_id} onChange={set("warehouse_id")}><option value="">Default</option>{(warehouses.data?.results ?? []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Field>
            <Field label="Date"><Input type="date" value={form.production_date} onChange={set("production_date")} /></Field>
          </div>
          <FormError error={save.error} />
          <Button type="submit" loading={save.isPending}>Plan it</Button>
        </form>
      </Card>
    </div>
  );
}

export default function NewProductionPage() {
  return <Suspense><NewProduction /></Suspense>;
}
