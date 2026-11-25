"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { AccountOptions } from "@/lib/api/accounting";
import { useBankAccounts } from "@/lib/api/banking";
import { api, unwrap } from "@/lib/api/client";
import { usePurchaseAccounts } from "@/lib/api/purchasing";
import { fmt, fmtDate } from "@/lib/format";
import { INBOX_KIND, INBOX_STATUS } from "@/lib/api/inbox";
import { useWorkspace } from "@/lib/workspace";

const CREATES: Record<string, [string, string, string]> = {
  // kind: (what accepting makes, where it lives, the permission it needs)
  invoice: ["a bill", "purchasing/bills", "bills.create"],
  quotation: ["a draft purchase order", "purchasing/orders", "purchaseorders.create"],
  purchase_order: ["a draft invoice", "sales/invoices", "invoices.create"],
  remittance: ["a payment received", "sales/payments", "payments.create"],
};

export default function InboxMessagePage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const path = { params: { path: { workspace: slug, id } } };
  const msg = useQuery({ queryKey: ["inbox-message", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/inbox/{id}/", path)) });
  const accounts = usePurchaseAccounts(slug);
  const qc = useQueryClient();
  const recount = () => void qc.invalidateQueries({ queryKey: ["workspace-context", slug] });
  // opening it marks it read on the server: refresh the Business inbox count in the menu
  const loaded = msg.data?.id;
  useEffect(() => { if (loaded) void qc.invalidateQueries({ queryKey: ["workspace-context", slug] }); }, [loaded, qc, slug]);
  const [account, setAccount] = useState("");
  const banks = useBankAccounts(slug);
  const [paidToo, setPaidToo] = useState(true);
  const [paidFrom, setPaidFrom] = useState("");
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const accept = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/inbox/{id}/accept/", { ...path, body: { account_id: account || null, paid_from_id: recordPaid || m?.kind === "remittance" ? paidFrom : null } })),
    onSuccess: (m) => { recount(); toast.success((m.payment_ids ?? []).length ? `Accepted: the bill is posted and ${(m.payment_ids ?? []).length === 1 ? "the payment is" : "the payments are"} recorded` : m.kind === "invoice" ? "Accepted: the bill is in Bills, to pay" : `Accepted: ${CREATES[m.kind][0]} is ready to check`); },
  });
  const decline = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/inbox/{id}/decline/", { ...path, body: { reason } })),
    onSuccess: () => { recount(); toast.success("Declined. The sender sees your reason."); setDeclining(false); },
  });
  if (msg.isLoading) return <Spinner />;
  if (msg.error) return <ErrorState error={msg.error} />;
  const m = msg.data!;
  const [makes, where, perm] = CREATES[m.kind];
  const decide = m.status === "new" && can("inbox.manage") && can(perm);
  const payments = m.payments ?? [];
  const canPay = m.kind === "invoice" && payments.length > 0 && can("bills.post") && can("supplierpayments.create");
  const recordPaid = canPay && paidToo;
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/inbox`} className="text-sm text-stone-500 hover:underline">&larr; Business inbox</Link>
      <PageHeader title={`${INBOX_KIND[m.kind]} ${m.number}`} description={`From ${m.sender_name}${m.sender_kra_pin ? ` (KRA PIN ${m.sender_kra_pin})` : ""}, sent ${fmtDate(m.created_at)}`} guide="business-inbox"
        actions={m.status === "accepted" && m.created_id && <Link href={`/w/${slug}/${where}/${m.created_id}`}><Button>Open {makes.replace(/^a (draft )?/, "the ")}</Button></Link>} />
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Badge tone={INBOX_STATUS[m.status][1]}>{INBOX_STATUS[m.status][0]}</Badge>
        <span className="text-stone-600">Dated {fmtDate(m.document_date)}{m.due_date ? ` · ${m.kind === "invoice" ? "due" : m.kind === "quotation" ? "valid until" : "needed by"} ${fmtDate(m.due_date)}` : ""}</span>
        {m.decline_reason && <span className="text-stone-500">Declined: {m.decline_reason}</span>}
      </div>
      {m.message && <Card className="mb-4 p-4 text-sm"><p className="text-xs uppercase text-stone-500">Message</p><p className="mt-1 whitespace-pre-line">{m.message}</p></Card>}
      <Card className="mb-4">
        <Table head={["Item", "Qty", "Price", "VAT", "Amount"]}>
          {m.lines.map((l, i) => (
            <tr key={i}>
              <Td>{l.description}</Td>
              <Td className="text-right font-mono">{Number(l.quantity)} {l.unit}</Td>
              <Td className="text-right font-mono">{fmt(l.unit_price)}</Td>
              <Td className="text-right font-mono">{fmt(l.tax)}</Td>
              <Td className="text-right font-mono">{fmt(l.total)}</Td>
            </tr>
          ))}
        </Table>
        <dl className="grid grid-cols-[auto_8rem] justify-end gap-x-6 gap-y-1 border-t border-stone-200 px-4 py-3 text-right text-sm">
          <dt className="text-stone-500">Subtotal</dt><dd className="font-mono">{fmt(m.subtotal)}</dd>
          <dt className="text-stone-500">VAT</dt><dd className="font-mono">{fmt(m.tax_total)}</dd>
          <dt className="font-semibold">Total {m.currency}</dt><dd className="font-mono font-semibold">{fmt(m.total)}</dd>
        </dl>
      </Card>
      {payments.length > 0 && (
        <Card className="mb-4 p-4 text-sm">
          <p className="font-medium text-stone-900">{m.sender_name} has recorded {Number(m.paid_amount) >= Number(m.total) ? "this as paid" : `${fmt(m.paid_amount)} of it as paid`}</p>
          <ul className="mt-2 space-y-1 text-stone-700">
            {payments.map((p, i) => <li key={i}>{fmtDate(p.date)} · {m.currency} {fmt(p.amount)} · {p.method === "mpesa" ? "M-Pesa" : p.method}{p.reference ? ` · ref ${p.reference}` : ""}{p.number ? ` · their receipt ${p.number}` : ""}</li>)}
          </ul>
        </Card>
      )}
      {decide && (
        <Card className="space-y-3 p-4">
          {m.kind === "remittance" ? (
            <>
              <p className="text-sm text-stone-700">{m.sender_name} paid you. Accepting records the payment received, applied to your invoices listed above by their numbers. Anything that matches no open invoice stays as their credit.</p>
              <Field label="Received into" hint="The bank, M-Pesa or cash account the money came into.">
                <Select value={paidFrom} onChange={(e) => setPaidFrom(e.target.value)}>
                  <option value="">Choose an account</option>
                  {(banks.data?.results ?? []).filter((b) => b.is_active).map((b) => <option key={b.id} value={b.ledger_account_id}>{b.name}</option>)}
                </Select>
              </Field>
            </>
          ) : <p className="text-sm text-stone-700">Accepting makes {makes} in your books with these lines{m.kind === "invoice" ? ` and ${m.sender_name} as the supplier` : m.kind === "purchase_order" ? ` and ${m.sender_name} as the customer` : ""}{m.kind === "invoice" ? ". It is posted straight away, so it shows under Bills to pay and Coming up." : ". Check it, then post or issue it as usual."}</p>}
          {m.kind === "invoice" && (
            <Field label="Record the bill in" hint="Stock items: Cost of goods sold or Inventory; otherwise the expense it is for.">
              <Select value={account} onChange={(e) => setAccount(e.target.value)}><option value="">Choose an account</option><AccountOptions accounts={accounts.data} /></Select>
            </Field>
          )}
          {canPay && (
            <div className="space-y-2 rounded-md border border-stone-200 p-3">
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={paidToo} onChange={(e) => setPaidToo(e.target.checked)} />
                <span>We paid this: post the bill and record {payments.length === 1 ? "the payment" : `the ${payments.length} payments`} on {payments.length === 1 ? "its date" : "their dates"}, with the same references</span></label>
              {paidToo && (
                <Field label="Paid from" hint="The bank, M-Pesa or cash account the money left.">
                  <Select value={paidFrom} onChange={(e) => setPaidFrom(e.target.value)}>
                    <option value="">Choose an account</option>
                    {(banks.data?.results ?? []).filter((b) => b.is_active).map((b) => <option key={b.id} value={b.ledger_account_id}>{b.name}</option>)}
                  </Select>
                </Field>
              )}
            </div>
          )}
          <FormError error={accept.error} />
          <div className="flex flex-wrap gap-2">
            <Button loading={accept.isPending} disabled={(m.kind === "invoice" && !account) || ((recordPaid || m.kind === "remittance") && !paidFrom)} onClick={() => accept.mutate()}>{recordPaid ? "Accept and record as paid" : "Accept"}</Button>
            <Button variant="secondary" onClick={() => { decline.reset(); setDeclining(true); }}>Decline</Button>
          </div>
        </Card>
      )}
      <Modal open={declining} title="Decline" onClose={() => setDeclining(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); decline.mutate(); }}>
          <Field label="Why?" hint="The sender sees this, for example: wrong price, not our order."><Input required value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <FormError error={decline.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setDeclining(false)}>Cancel</Button><Button type="submit" variant="danger" loading={decline.isPending}>Decline</Button></div>
        </form>
      </Modal>
    </div>
  );
}
