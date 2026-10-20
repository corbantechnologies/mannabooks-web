"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge, Button, Card, EmptyState, Field, FormError, Input, Modal, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { usePriceLists } from "@/lib/api/sales";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function PriceListsPage() {
  const { slug, can } = useWorkspace();
  const router = useRouter();
  const lists = usePriceLists(slug);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", adjust_percent: "0" });
  const create = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/price-lists/", { ...wsPath(slug), body: { ...form, items: [] } })),
    onSuccess: (p) => router.push(`/w/${slug}/sales/price-lists/${p.id}`),
  });
  const rows = lists.data?.results ?? [];
  return (
    <div className="w-full">
      <PageHeader
        title="Price lists"
        description="Special prices for groups of customers, such as wholesale or contract prices. Give a customer a price list and their sales lines use it."
        guide="price-lists"
        actions={can("products.manage") && <Button onClick={() => { create.reset(); setCreating(true); }}><Plus className="h-4 w-4" /> New price list</Button>}
      />
      <Card>
        {lists.isLoading ? <div className="px-4"><Spinner /></div> : rows.length === 0 ? <EmptyState title="No price lists yet" /> : (
          <Table head={["Name", "Other products", "Products listed", "Customers"]}>
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-stone-50">
                <Td><Link href={`/w/${slug}/sales/price-lists/${p.id}`} className="font-medium hover:underline">{p.name}</Link> {!p.is_active && <Badge>Inactive</Badge>}</Td>
                <Td>{Number(p.adjust_percent) === 0 ? "Normal price" : `${Number(p.adjust_percent) > 0 ? "+" : ""}${Number(p.adjust_percent)}%`}</Td>
                <Td className="text-right">{(p.items ?? []).length}</Td>
                <Td className="text-right">{p.customer_count}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={creating} title="New price list" onClose={() => setCreating(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <Field label="Name" error={fieldError(create.error, "name")}><Input required value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Wholesale" /></Field>
          <Field label="Products not on the list" error={fieldError(create.error, "adjust_percent")} hint="% above or below the normal price, e.g. -10 for 10% off.">
            <Input inputMode="decimal" value={form.adjust_percent} onChange={(e) => setForm((prev) => ({ ...prev, adjust_percent: e.target.value }))} />
          </Field>
          <FormError error={create.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit" loading={create.isPending}>Create</Button></div>
        </form>
      </Modal>
    </div>
  );
}
