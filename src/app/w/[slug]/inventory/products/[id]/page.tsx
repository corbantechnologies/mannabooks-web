"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

const LINKS: Record<string, string> = {
  invoice: "/sales/invoices", receipt: "/sales/cash-sales", credit_note: "/sales/credit-notes", goods_receipt: "/purchasing/receipts",
  bill: "/purchasing/bills", stock_transfer: "/inventory/transfers", stock_adjustment: "/inventory/adjustments", stock_take: "/inventory/stock-takes",
  production_order: "/manufacturing/production",
};

/** The stock card: every movement of one product. */
export default function StockCardPage() {
  const { slug } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const product = useQuery({ queryKey: ["product", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/products/{id}/", { params: { path: { workspace: slug, id } } })) });
  const moves = useQuery({
    queryKey: ["stock-movements", slug, id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/stock/movements/", { params: { path: { workspace: slug }, query: { product: id, page_size: 200 } } })),
  });
  if (product.isLoading) return <Spinner />;
  if (product.error) return <ErrorState error={product.error} />;
  const p = product.data!;
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/inventory`} className="text-sm text-stone-500 hover:underline">&larr; Stock</Link>
      <PageHeader title={p.name} description={`Stock card · ${p.stock_on_hand != null ? `${Number(p.stock_on_hand)} ${p.unit} on hand` : "stock not tracked"}`} guide="inventory" />
      <Card>
        {(moves.data?.results ?? []).length === 0 ? <EmptyState title="No movements yet" /> : (
          <Table head={["Date", "What", "Document", "Warehouse", "In / out", "Unit cost", "Value", "Balance"]}>
            {moves.data!.results.map((m) => (
              <tr key={m.id}>
                <Td className="whitespace-nowrap">{fmtDate(m.movement_date)}</Td>
                <Td>{m.kind_label}</Td>
                <Td>{LINKS[m.source_type] ? <Link className="font-mono text-xs hover:underline" href={`/w/${slug}${LINKS[m.source_type]}/${m.source_id}`}>{m.source_number}</Link> : m.source_number}</Td>
                <Td>{m.warehouse_name}</Td>
                <Td className={`text-right font-mono ${Number(m.quantity) < 0 ? "text-red-600" : "text-green-700"}`}>{Number(m.quantity) > 0 ? "+" : ""}{Number(m.quantity)}</Td>
                <Td className="text-right font-mono">{fmt(m.unit_cost)}</Td>
                <Td className="text-right font-mono">{fmt(m.value)}</Td>
                <Td className="text-right font-mono">{Number(m.balance_quantity)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
