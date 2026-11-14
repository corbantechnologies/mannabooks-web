"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";

import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { LINK_PURPOSE as PURPOSE } from "@/lib/payment-links";
import { useWorkspace } from "@/lib/workspace";

export default function PaymentLinksPage() {
  const { slug, can } = useWorkspace();
  const list = useQuery({
    queryKey: ["payment-links", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/payment-links/", { params: { path: { workspace: slug }, query: { page_size: 100 } as never } })),
  });
  const rows = list.data?.results ?? [];
  return (
    <div className="w-full">
      <PageHeader title="Payment links" guide="payment-links"
        description="A link that takes one payment, by M-Pesa or card, with no invoice first: a sale, a deposit, a donation or a gift voucher. Share it on WhatsApp or as a QR code."
        actions={can("paymentlinks.manage") && (
          <Link href={`/w/${slug}/sales/payment-links/new`} className="inline-flex items-center gap-1.5 rounded-md bg-brand-700 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-600">
            <Plus className="h-4 w-4" /> New link
          </Link>
        )} />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="No payment links yet">Make one for a deposit, a fixed fee, event tickets, donations or gift vouchers, and share it with anyone.</EmptyState>
        ) : (
          <Table head={["Link", "For", "Price", "Paid", "Collected", "Status"]}>
            {rows.map((l) => {
              const expired = l.expires_on && l.expires_on < new Date().toISOString().slice(0, 10);
              return (
                <tr key={l.id} className="hover:bg-stone-50">
                  <Td><Link className="font-medium hover:underline" href={`/w/${slug}/sales/payment-links/${l.id}`}>{l.title}</Link>
                    {l.product_name && <span className="block text-xs text-stone-500">{l.product_name}</span>}</Td>
                  <Td>{PURPOSE[l.purpose ?? "sale"]}</Td>
                  <Td className="text-right font-mono">{l.unit_price ? fmt(l.unit_price) : "Payer chooses"}</Td>
                  <Td className="text-right">{l.stats.paid_count}</Td>
                  <Td className="text-right font-mono">{fmt(l.stats.paid_total)}</Td>
                  <Td>{!l.is_active ? <Badge>Closed</Badge> : expired ? <Badge tone="amber">Expired {fmtDate(l.expires_on!)}</Badge> : <Badge tone="green">Open</Badge>}</Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
}
