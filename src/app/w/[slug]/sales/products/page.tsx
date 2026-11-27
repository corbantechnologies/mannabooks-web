"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Rows3, Search, Tags, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useCategories } from "@/lib/api/sales";
import { fmt } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";
import { ask } from "@/components/confirm";

export default function ProductsPage() {
  const { slug, can, context } = useWorkspace();
  const manage = can("products.manage");
  const [picked, setPicked] = useState<string[]>([]);
  const bulkDelete = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/products/bulk-delete/", { ...wsPath(slug), body: { ids: picked } })),
    onSuccess: (r) => {
      toast.success([r.deleted ? `${r.deleted} deleted` : "", r.deactivated ? `${r.deactivated} made inactive (on past documents)` : ""].filter(Boolean).join(", ") || "Nothing changed");
      setPicked([]); void list.refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const [search, setSearch] = useState("");
  const router = useRouter();
  const categories = useCategories(slug);
  const [category, setCategory] = useState("");
  const list = useQuery({
    queryKey: ["products", slug, "all", search, category],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/products/", { params: { path: { workspace: slug }, query: { search: search || undefined, category: category || undefined, page_size: 200 } } })),
  });
  const rows = list.data?.results ?? [];

  return (
    <div className="w-full">
      <PageHeader
        title="Products and services"
        description="What you sell, with its price and VAT. Lines on quotations, invoices and cash sales fill in from here."
        guide="products"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/w/${slug}/sales/catalogue`}><Button variant="secondary"><Tags className="h-4 w-4" /> Categories and units</Button></Link>
            {manage && <Link href={`/w/${slug}/sales/products/bulk`}><Button variant="secondary"><Rows3 className="h-4 w-4" /> Add many</Button></Link>}
            {manage && <Link href={`/w/${slug}/data?kind=products`}><Button variant="secondary"><Upload className="h-4 w-4" /> Import</Button></Link>}
            {manage && <Link href={`/w/${slug}/sales/products/new`}><Button><Plus className="h-4 w-4" /> New product</Button></Link>}
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <Input className="pl-9" placeholder="Search name or code" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-56">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {(categories.data?.results ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title={search ? "No products match" : "No products yet"} />
        ) : (
          <>
          {manage && picked.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 border-b border-stone-200 bg-brand-50 px-4 py-2 text-sm">
              <span className="font-medium">{picked.length} selected</span>
              <Button variant="danger" className="py-1" loading={bulkDelete.isPending}
                onClick={() => void ask(`Delete ${picked.length} product${picked.length === 1 ? "" : "s"}? Any already on invoices, quotations, bills or stock are kept and made inactive instead.`, { confirmLabel: "Delete" }).then((ok) => ok && bulkDelete.mutate())}>Delete</Button>
              <button type="button" className="text-stone-600 hover:underline" onClick={() => setPicked([])}>Clear</button>
            </div>
          )}
          <Table head={[...(manage ? [<input key="all" type="checkbox" aria-label="Select all shown" checked={rows.length > 0 && rows.every((p) => picked.includes(p.id))}
            onChange={(e) => setPicked(e.target.checked ? rows.map((p) => p.id) : [])} />] : []), "Code", "Name", "Category", "In stock", `Price (${context.workspace.currency})`, "VAT"]}>
            {rows.map((p) => (
              <tr key={p.id} className={manage ? "cursor-pointer hover:bg-stone-50" : ""} onClick={() => manage && router.push(`/w/${slug}/sales/products/${p.id}/edit`)}>
                {manage && <Td className="w-8" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${p.name}`} checked={picked.includes(p.id)}
                  onChange={(e) => setPicked((x) => (e.target.checked ? [...x, p.id] : x.filter((v) => v !== p.id)))} /></Td>}
                <Td className="font-mono text-xs">{p.code || "-"}</Td>
                <Td className="font-medium">{p.name} {!p.is_active && <Badge>Inactive</Badge>}</Td>
                <Td className="text-stone-600">{p.category_name ?? "-"}</Td>
                <Td className="text-right font-mono">{p.stock_on_hand != null ? `${Number(p.stock_on_hand)} ${p.unit}` : p.made_to_order ? <span className="font-sans text-xs text-stone-500">Made to order</span> : "-"}</Td>
                <Td className="text-right font-mono">{fmt(p.sale_price)}</Td>
                <Td className="text-stone-500">{p.tax_rate_name ?? "Workspace default"}</Td>
              </tr>
            ))}
          </Table>
          </>
        )}
      </Card>
    </div>
  );
}
