"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { MPESA_STATUS, useCustomers, useOpenInvoices } from "@/lib/api/sales";
import type { MpesaTransaction } from "@/lib/api/types";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function MpesaPaymentsPage() {
  const { slug, can } = useWorkspace();
  const [tab, setTab] = useState<"unmatched" | "all">("unmatched");
  const [search, setSearch] = useState("");
  const [applying, setApplying] = useState<MpesaTransaction | null>(null);
  const list = useQuery({
    queryKey: ["mpesa-transactions", slug, tab, search],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/mpesa/transactions/", {
      params: { path: { workspace: slug }, query: { matched: tab === "unmatched" ? "false" : undefined, search: search || undefined, page_size: 100 } as never },
    })),
  });
  const rows = list.data?.results ?? [];
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="M-Pesa payments"
        description="Payments seen through your Daraja app. Those paid with an invoice number as the account are recorded automatically; apply the rest to a customer."
        guide="mpesa"
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {(["unmatched", "all"] as const).map((t) => (
          <Button key={t} variant={tab === t ? "primary" : "secondary"} onClick={() => setTab(t)}>{t === "unmatched" ? "To apply" : "All"}</Button>
        ))}
        <div className="w-72"><Input placeholder="Search code, phone or name" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title={tab === "unmatched" ? "Nothing to apply" : "No M-Pesa payments yet"} />
        ) : (
          <Table head={["Date", "Code", "From", "Account no.", "Amount", "Recorded as", ""]}>
            {rows.map((t) => (
              <tr key={t.id}>
                <Td className="whitespace-nowrap">{fmtDate(t.paid_at ?? t.created_at)}</Td>
                <Td className="font-mono text-xs">{t.mpesa_receipt || "-"}</Td>
                <Td>{t.payer_name || t.phone}</Td>
                <Td className="font-mono text-xs">{t.account_reference}</Td>
                <Td className="text-right font-mono">{fmt(t.amount)}</Td>
                <Td>
                  {t.payment_id ? <Link className="font-mono text-xs hover:underline" href={`/w/${slug}/sales/payments/${t.payment_id}`}>{t.payment_number}</Link>
                    : t.receipt_id ? <Link className="font-mono text-xs hover:underline" href={`/w/${slug}/sales/cash-sales/${t.receipt_id}`}>{t.receipt_number}</Link>
                    : <Badge tone={MPESA_STATUS[t.status ?? "pending"].tone}>{MPESA_STATUS[t.status ?? "pending"].label}</Badge>}
                </Td>
                <Td>{t.status === "completed" && !t.is_matched && can("payments.create") && <Button variant="secondary" className="px-2 py-1" onClick={() => setApplying(t)}>Apply</Button>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {applying && <ApplyModal tx={applying} onClose={() => setApplying(null)} />}
    </div>
  );
}

function ApplyModal({ tx, onClose }: { tx: MpesaTransaction; onClose: () => void }) {
  const { slug } = useWorkspace();
  const customers = useCustomers(slug);
  const [customerId, setCustomerId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const invoices = useOpenInvoices(slug, customerId || "none");
  const apply = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/mpesa/transactions/{id}/apply/", {
      params: { path: { workspace: slug, id: tx.id } }, body: { customer_id: customerId, invoice_id: invoiceId || null },
    })),
    onSuccess: (t) => { toast.success(`Recorded as ${t.payment_number}`); onClose(); },
  });
  return (
    <Modal open title={`Apply ${tx.mpesa_receipt} (${fmt(tx.amount)})`} onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); apply.mutate(); }}>
        <p className="text-sm text-stone-600">From {tx.payer_name || tx.phone}{tx.account_reference ? `, account "${tx.account_reference}"` : ""}.</p>
        <Field label="Customer">
          <Select required value={customerId} onChange={(e) => { setCustomerId(e.target.value); setInvoiceId(""); }}>
            <option value="">Choose a customer</option>
            {(customers.data?.results ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        {customerId && (
          <Field label="Invoice (optional)" hint="Blank: kept as the customer's credit, to apply later.">
            <Select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
              <option value="">No invoice</option>
              {(invoices.data?.results ?? []).filter((i) => i.status !== "paid").map((i) => <option key={i.id} value={i.id}>{i.number} · balance {fmt(i.balance_due)}</option>)}
            </Select>
          </Field>
        )}
        <FormError error={apply.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={apply.isPending}>Record payment</Button></div>
      </form>
    </Modal>
  );
}
