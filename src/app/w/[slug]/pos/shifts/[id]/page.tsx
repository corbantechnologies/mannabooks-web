"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Meta } from "@/components/document-view";
import { Badge, Card, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { METHODS, type ShiftTotals } from "@/lib/api/sales";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";


export default function ShiftPage() {
  const { slug } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const shift = useQuery({ queryKey: ["pos-shift", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/pos/shifts/{id}/", { params: { path: { workspace: slug, id } } })) });
  const sales = useQuery({
    queryKey: ["receipts", slug, "shift", id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/receipts/", { params: { path: { workspace: slug }, query: { shift: id, page_size: 200 } } })),
  });
  if (shift.isLoading) return <Spinner />;
  if (shift.error) return <ErrorState error={shift.error} />;
  const s = shift.data!;
  const totals = s.totals as unknown as ShiftTotals;
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/pos/shifts`} className="text-sm text-stone-500 hover:underline">&larr; Shifts</Link>
      <PageHeader title={`Shift ${s.number}`} description={`${s.register_name} · ${s.cashier_name}`} guide="pos" />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-4">
        <Meta label="Status"><Badge tone={s.status === "open" ? "green" : "stone"}>{s.status === "open" ? "Open" : "Closed"}</Badge></Meta>
        <Meta label="Opened">{fmtDate(s.opened_at)}</Meta>
        <Meta label="Closed">{s.closed_at ? fmtDate(s.closed_at) : "-"}</Meta>
        <Meta label="Opening float">{fmt(s.opening_float)}</Meta>
        <Meta label="Sales">{totals.sales_count} · {fmt(totals.sales_total)}</Meta>
        <Meta label="Expected cash">{fmt(s.status === "closed" ? s.expected_cash : totals.expected_cash)}</Meta>
        {s.status === "closed" && <Meta label="Counted">{fmt(s.counted_cash)}</Meta>}
        {s.status === "closed" && <Meta label="Over / short"><span className={Number(s.cash_difference) < 0 ? "text-red-600" : ""}>{fmt(s.cash_difference)}</span></Meta>}
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <Table head={["Paid by", "Sales", "Total"]}>
            {totals.by_method.map((m) => (
              <tr key={m.method}><Td>{METHODS.find((x) => x.value === m.method)?.label}</Td><Td className="text-right">{m.count}</Td><Td className="text-right font-mono">{fmt(m.total)}</Td></tr>
            ))}
          </Table>
        </Card>
        <div className="lg:col-span-2">
          <Card>
            <Table head={["Receipt", "Customer", "Paid by", "Total", ""]}>
              {(sales.data?.results ?? []).map((r) => (
                <tr key={r.id}>
                  <Td><Link href={`/w/${slug}/sales/cash-sales/${r.id}`} className="font-mono text-xs hover:underline">{r.number}</Link></Td>
                  <Td>{r.customer_name || "Walk-in"}</Td>
                  <Td>{METHODS.find((m) => m.value === r.method)?.label}</Td>
                  <Td className="text-right font-mono">{fmt(r.total)}</Td>
                  <Td>{r.status === "void" && <Badge>Void</Badge>}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      </div>
      {s.closing_notes && <p className="mt-4 text-sm text-stone-600">{s.closing_notes}</p>}
    </div>
  );
}
