"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, ErrorState, Field, FormError, Input, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { useProducts } from "@/lib/api/sales";
import type { PriceList } from "@/lib/api/types";
import { fmt } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function PriceListPage() {
  const { slug } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const list = useQuery({ queryKey: ["price-list", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/price-lists/{id}/", { params: { path: { workspace: slug, id } } })) });
  if (list.isLoading) return <Spinner />;
  if (list.error) return <ErrorState error={list.error} />;
  return <Editor list={list.data!} />;
}

function Editor({ list }: { list: PriceList }) {
  const { slug, can } = useWorkspace();
  const router = useRouter();
  const manage = can("products.manage");
  const products = useProducts(slug);
  const [head, setHead] = useState({ name: list.name, adjust_percent: String(Number(list.adjust_percent ?? 0)), is_active: list.is_active ?? true });
  const [items, setItems] = useState((list.items ?? []).map((i) => ({ product_id: i.product_id, price: String(Number(i.price)) })));
  const byId = Object.fromEntries((products.data?.results ?? []).map((p) => [p.id, p]));
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PATCH("/api/v1/w/{workspace}/price-lists/{id}/", {
      params: { path: { workspace: slug, id: list.id } }, body: { ...head, items: items.filter((i) => i.product_id) },
    })),
    onSuccess: () => toast.success("Price list saved"),
  });
  const remove = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/w/{workspace}/price-lists/{id}/", { params: { path: { workspace: slug, id: list.id } } })),
    onSuccess: () => { toast.success("Price list deleted"); router.replace(`/w/${slug}/sales/price-lists`); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="max-w-4xl">
      <Link href={`/w/${slug}/sales/price-lists`} className="text-sm text-stone-500 hover:underline">&larr; Price lists</Link>
      <PageHeader title={list.name} description={`Used by ${list.customer_count ?? 0} customer(s).`} guide="price-lists"
        actions={manage && <Button variant="ghost" className="text-red-600" loading={remove.isPending} onClick={() => confirm("Delete this price list?") && remove.mutate()}>Delete</Button>} />
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <fieldset disabled={!manage} className="space-y-4">
          <Card className="grid gap-3 p-4 sm:grid-cols-3">
            <Field label="Name" error={fieldError(save.error, "name")}><Input required value={head.name} onChange={(e) => setHead((prev) => ({ ...prev, name: e.target.value }))} /></Field>
            <Field label="Products not listed below" hint="% on the normal price; -10 is 10% off." error={fieldError(save.error, "adjust_percent")}>
              <Input inputMode="decimal" value={head.adjust_percent} onChange={(e) => setHead((prev) => ({ ...prev, adjust_percent: e.target.value }))} />
            </Field>
            <label className="mt-6 flex items-center gap-2 text-sm"><input type="checkbox" checked={head.is_active} onChange={(e) => setHead((prev) => ({ ...prev, is_active: e.target.checked }))} /> Active</label>
          </Card>
          <Card>
            <Table head={["Product", "Normal price", "Price on this list", ""]}>
              {items.map((item, i) => (
                <tr key={i}>
                  <Td>
                    <Select value={item.product_id} onChange={(e) => {
                      const p = byId[e.target.value];
                      setItems((prev) => prev.map((x, n) => (n === i ? { product_id: e.target.value, price: x.price || String(Number(p?.sale_price ?? 0)) } : x)));
                    }}>
                      <option value="">Choose a product</option>
                      {(products.data?.results ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                  </Td>
                  <Td className="text-right font-mono text-stone-500">{item.product_id ? fmt(byId[item.product_id]?.sale_price) : ""}</Td>
                  <Td className="w-44"><Input inputMode="decimal" className="text-right" value={item.price} onChange={(e) => setItems((prev) => prev.map((x, n) => (n === i ? { ...x, price: e.target.value } : x)))} /></Td>
                  <Td className="w-10"><button type="button" aria-label="Remove" className="rounded p-1.5 text-stone-400 hover:text-red-600" onClick={() => setItems((prev) => prev.filter((_, n) => n !== i))}><Trash2 className="h-4 w-4" /></button></Td>
                </tr>
              ))}
            </Table>
            <div className="px-3 py-2"><Button type="button" variant="ghost" className="px-2 py-1" onClick={() => setItems((prev) => [...prev, { product_id: "", price: "" }])}><Plus className="h-4 w-4" /> Add product</Button></div>
          </Card>
        </fieldset>
        <FormError error={save.error} />
        {manage && <div className="flex justify-end"><Button type="submit" loading={save.isPending}>Save price list</Button></div>}
      </form>
    </div>
  );
}
