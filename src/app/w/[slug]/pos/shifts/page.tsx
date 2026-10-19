"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function ShiftsPage() {
  const { slug } = useWorkspace();
  const shifts = useQuery({ queryKey: ["pos-shifts", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/pos/shifts/", { params: { path: { workspace: slug }, query: { page_size: 100 } } })) });
  const rows = shifts.data?.results ?? [];
  return (
    <div className="max-w-6xl">
      <Link href={`/w/${slug}/pos`} className="text-sm text-stone-500 hover:underline">&larr; Point of sale</Link>
      <PageHeader title="Shifts" description="Each cashier session, with its takings and cash count." guide="pos" />
      <Card>
        {shifts.isLoading ? <div className="px-4"><Spinner /></div> : shifts.error ? <div className="p-4"><ErrorState error={shifts.error} /></div> : rows.length === 0 ? <EmptyState title="No shifts yet" /> : (
          <Table head={["Shift", "Till", "Cashier", "Opened", "Sales", "Cash difference", "Status"]}>
            {rows.map((s) => (
              <tr key={s.id} className="hover:bg-stone-50">
                <Td><Link href={`/w/${slug}/pos/shifts/${s.id}`} className="font-mono text-xs font-medium hover:underline">{s.number}</Link></Td>
                <Td>{s.register_name}</Td>
                <Td>{s.cashier_name}</Td>
                <Td className="whitespace-nowrap">{fmtDate(s.opened_at)}</Td>
                <Td className="text-right font-mono">{fmt((s.totals as { sales_total?: string }).sales_total)}</Td>
                <Td className={`text-right font-mono ${Number(s.cash_difference) < 0 ? "text-red-600" : ""}`}>{s.status === "closed" ? fmt(s.cash_difference) : ""}</Td>
                <Td><Badge tone={s.status === "open" ? "green" : "stone"}>{s.status === "open" ? "Open" : "Closed"}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
