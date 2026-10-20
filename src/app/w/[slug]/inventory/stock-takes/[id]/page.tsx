"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Meta } from "@/components/document-view";
import { Badge, Button, Card, ErrorState, FormError, Input, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { TAKE_STATUS } from "@/lib/api/purchasing";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function StockTakePage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const path = { params: { path: { workspace: slug, id } } };
  const take = useQuery({ queryKey: ["stock-take", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/stock-takes/{id}/", path)) });
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/stock-takes/{id}/counts/", {
      ...path, body: { counts: Object.entries(counts).map(([product_id, v]) => ({ product_id, counted_quantity: v === "" ? null : v })) } as never,
    })),
    onSuccess: () => { toast.success("Counts saved"); setCounts({}); },
  });
  const act = useMutation({
    mutationFn: async (action: "post" | "cancel") => {
      if (Object.keys(counts).length) await save.mutateAsync();
      return unwrap(await api.POST("/api/v1/w/{workspace}/stock-takes/{id}/action/", { ...path, body: { action } }));
    },
    onSuccess: (t) => toast.success(t.status === "posted" ? `Posted: difference ${fmt(t.difference_value)}` : "Count cancelled"),
  });
  if (take.isLoading) return <Spinner />;
  if (take.error) return <ErrorState error={take.error} />;
  const t = take.data!;
  const counting = t.status === "counting" && can("inventory.manage");
  const lines = t.lines.filter((l) => !search || l.product_name.toLowerCase().includes(search.toLowerCase()) || (l.product_code ?? "").toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/inventory/stock-takes`} className="text-sm text-stone-500 hover:underline">&larr; Stock takes</Link>
      <PageHeader title={`Stock take ${t.number}`} description={`${t.warehouse_name}${t.category_name ? ` · ${t.category_name}` : ""}`} guide="stock-takes"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print count sheet</Button>
            {counting && <Button variant="ghost" className="text-red-600" onClick={() => confirm("Cancel this count?") && act.mutate("cancel")}>Cancel</Button>}
            {counting && <Button variant="secondary" loading={save.isPending} disabled={!Object.keys(counts).length} onClick={() => save.mutate()}>Save counts</Button>}
            {counting && <Button loading={act.isPending} onClick={() => confirm("Post the count? Stock moves to the counted quantities.") && act.mutate("post")}>Post</Button>}
          </div>
        } />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-4">
        <Meta label="Status"><Badge tone={TAKE_STATUS[t.status ?? "counting"].tone}>{TAKE_STATUS[t.status ?? "counting"].label}</Badge></Meta>
        <Meta label="Date">{fmtDate(t.count_date)}</Meta>
        <Meta label="Counted">{t.counted}</Meta>
        {t.status === "posted" && <Meta label="Difference">{fmt(t.difference_value)}</Meta>}
      </Card>
      <div className="mb-3 max-w-xs print:hidden"><Input placeholder="Find a product" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <FormError error={save.error ?? act.error} />
      <Card>
        <Table head={["Product", "Books say", "Counted", "Difference", "Value"]}>
          {lines.map((l) => {
            const value = counts[l.product_id] ?? (l.counted_quantity == null ? "" : String(Number(l.counted_quantity)));
            const diff = value === "" ? null : Number(value) - Number(l.system_quantity);
            return (
              <tr key={l.id}>
                <Td>{l.product_name}{l.product_code && <span className="ml-1 font-mono text-xs text-stone-400">{l.product_code}</span>}</Td>
                <Td className="text-right font-mono">{Number(l.system_quantity)} {l.unit}</Td>
                <Td className="w-32">{counting ? <Input inputMode="decimal" className="text-right" value={value} onChange={(e) => setCounts((p) => ({ ...p, [l.product_id]: e.target.value }))} /> : <span className="font-mono">{l.counted_quantity == null ? "-" : Number(l.counted_quantity)}</span>}</Td>
                <Td className={`text-right font-mono ${diff && diff < 0 ? "text-red-600" : diff ? "text-green-700" : ""}`}>{diff == null ? "" : diff > 0 ? `+${diff}` : diff}</Td>
                <Td className="text-right font-mono">{t.status === "posted" ? fmt(l.value) : ""}</Td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </div>
  );
}
