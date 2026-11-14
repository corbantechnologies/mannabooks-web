"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { ask } from "@/components/confirm";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { LINK_PURPOSE } from "@/lib/payment-links";
import { useWorkspace } from "@/lib/workspace";

export default function PaymentLinkPage() {
  const { slug, can, context } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const path = { params: { path: { workspace: slug, id } } };
  const link = useQuery({ queryKey: ["payment-link", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/payment-links/{id}/", path)) });
  const payments = useQuery({
    queryKey: ["payment-link-payments", slug, id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/payment-links/{id}/payments/", { params: { path: { workspace: slug, id }, query: { page_size: 100 } as never } })),
  });
  const toggle = useMutation({
    mutationFn: async (is_active: boolean) => unwrap(await api.PATCH("/api/v1/w/{workspace}/payment-links/{id}/", { ...path, body: { is_active } as never })),
    onSuccess: (l) => { toast.success(l.is_active ? "Link open again" : "Link closed"); void qc.invalidateQueries({ queryKey: ["payment-link", slug, id] }); },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/w/{workspace}/payment-links/{id}/", path)),
    onSuccess: () => { toast.success("Link deleted"); router.replace(`/w/${slug}/sales/payment-links`); },
    onError: (e) => toast.error(e.message),
  });
  if (link.isLoading) return <Spinner />;
  if (link.error) return <ErrorState error={link.error} />;
  const l = link.data!;
  const manage = can("paymentlinks.manage");
  const share = `${l.title}: pay ${context.workspace.name} here ${l.url}`;
  const rows = payments.data?.results ?? [];
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/sales/payment-links`} className="text-sm text-stone-500 hover:underline">&larr; Payment links</Link>
      <PageHeader title={l.title} guide="payment-links"
        description={`${LINK_PURPOSE[l.purpose ?? "sale"]}${l.product_name ? `: ${l.product_name}` : ""}. ${l.unit_price ? `${fmt(l.unit_price)} ${context.workspace.currency}${l.allow_quantity ? " each" : ""}` : "The payer chooses the amount"}.`}
        actions={manage && <div className="flex flex-wrap gap-2">
          {l.stats.paid_count === 0 && <Button variant="ghost" className="text-red-600" onClick={() => void ask("Delete this link? Anyone who has it can no longer pay.", { danger: true }).then((ok) => ok && remove.mutate())}>Delete</Button>}
          <Button variant="secondary" loading={toggle.isPending} onClick={() => toggle.mutate(!l.is_active)}>{l.is_active ? "Close link" : "Open again"}</Button>
        </div>} />

      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <Card className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            {l.is_active ? <Badge tone="green">Open</Badge> : <Badge>Closed</Badge>}
            {l.expires_on && <Badge tone="amber">Until {fmtDate(l.expires_on)}</Badge>}
            {l.max_payments && <Badge tone="blue">{l.stats.paid_count} of {l.max_payments} paid</Badge>}
          </div>
          <div>
            <p className="text-sm font-medium text-stone-900">Share this link</p>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded border border-stone-200 bg-stone-50 px-2 py-1.5 text-sm">{l.url}</code>
              <Button variant="secondary" onClick={() => void navigator.clipboard.writeText(l.url).then(() => toast.success("Link copied"))}><Copy className="h-4 w-4" /> Copy</Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <a className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50" target="_blank" rel="noreferrer"
                href={`https://wa.me/?text=${encodeURIComponent(share)}`}><MessageCircle className="h-4 w-4 text-green-600" /> Share on WhatsApp</a>
              <a className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50" target="_blank" rel="noreferrer" href={l.url}>Open the payer&apos;s page</a>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-stone-50 p-3"><dt className="text-xs text-stone-500">Views</dt><dd className="mt-1 font-mono text-lg font-semibold">{l.stats.view_count}</dd></div>
            <div className="rounded-lg bg-stone-50 p-3"><dt className="text-xs text-stone-500">Payments</dt><dd className="mt-1 font-mono text-lg font-semibold">{l.stats.paid_count}</dd></div>
            <div className="rounded-lg bg-stone-50 p-3"><dt className="text-xs text-stone-500">Collected</dt><dd className="mt-1 font-mono text-lg font-semibold">{fmt(l.stats.paid_total)}</dd></div>
          </dl>
        </Card>
        <Card className="flex flex-col items-center p-5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {l.qr && <img src={l.qr} alt="QR code for this payment link" className="h-48 w-48" />}
          <p className="mt-2 text-xs text-stone-500">Print it on a poster, a counter card or a church notice. Scanning it opens the payment page.</p>
          {l.qr && <a href={l.qr} download={`${l.title} QR.svg`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"><Download className="h-4 w-4" /> Download QR code</a>}
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="border-b border-stone-200 px-4 py-3 font-semibold">Payments</h2>
        {payments.isLoading ? <div className="px-4"><Spinner /></div> : rows.length === 0 ? (
          <EmptyState title="No payments yet">They appear here as people pay, with the cash sale, deposit or voucher each became.</EmptyState>
        ) : (
          <Table head={["Date", "Paid by", "Amount", "How", "Recorded as", "Status"]}>
            {rows.map((p) => (
              <tr key={p.id}>
                <Td>{fmtDate(p.paid_at ?? p.created_at)}</Td>
                <Td>{p.payer_name}<span className="block text-xs text-stone-500">{[p.phone, p.email].filter(Boolean).join(" · ")}{p.note ? ` · ${p.note}` : ""}</span></Td>
                <Td className="text-right font-mono">{fmt(p.amount)}{p.quantity > 1 && <span className="block text-xs text-stone-500">{p.quantity} ×</span>}</Td>
                <Td>{p.method === "mpesa" ? "M-Pesa" : "Card"}</Td>
                <Td>
                  {p.receipt && <Link className="hover:underline" href={`/w/${slug}/sales/cash-sales/${p.receipt}`}>Cash sale {p.receipt_number}</Link>}
                  {p.payment && <Link className="hover:underline" href={`/w/${slug}/sales/payments/${p.payment}`}>Deposit {p.payment_number}{p.customer_name ? ` (${p.customer_name})` : ""}</Link>}
                  {p.voucher && <Link className="hover:underline" href={`/w/${slug}/sales/gift-vouchers`}>Voucher {p.voucher_code}</Link>}
                  {p.result_description && <span className="block text-xs text-amber-700">{p.result_description}</span>}
                </Td>
                <Td><Badge tone={p.status === "paid" ? "green" : p.status === "failed" ? "red" : "amber"}>{p.status === "paid" ? "Paid" : p.status === "failed" ? "Not paid" : "Waiting"}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
