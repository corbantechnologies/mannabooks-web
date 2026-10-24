"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { RelatedDocuments } from "@/components/related-documents";
import { ApprovalPanel } from "@/components/approval-panel";
import { Meta } from "@/components/document-view";
import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { useApprovalStatus } from "@/lib/api/control";
import { PAY_METHODS, PV_STATUS, usePayingAccounts } from "@/lib/api/purchasing";
import { depositFor } from "@/lib/api/sales";
import { fmt, fmtDate, todayIso } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { ask } from "@/components/confirm";

export default function VoucherPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const approval = useApprovalStatus(slug, "payment_voucher", id);
  const path = { params: { path: { workspace: slug, id } } };
  const accounts = usePayingAccounts(slug);
  const [paying, setPaying] = useState(false);
  const [pay, setPay] = useState({ payment_date: todayIso(), method: "bank", paid_from_id: "", reference: "" });
  const voucher = useQuery({ queryKey: ["payment-voucher", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/payment-vouchers/{id}/", path)) });
  const act = useMutation({
    mutationFn: async (action: "approve" | "cancel" | "pay") => unwrap(await api.POST("/api/v1/w/{workspace}/payment-vouchers/{id}/action/", {
      ...path, body: (action === "pay" ? { action, ...pay, paid_from_id: pay.paid_from_id || depositFor(accounts.data, pay.method) } : { action }) as never,
    })),
    onSuccess: (v) => { toast.success(`Voucher ${PV_STATUS[v.status ?? "draft"].label.toLowerCase()}`); setPaying(false); },
    onError: (e) => { if (!paying) toast.error(e.message); },
  });
  if (voucher.isLoading) return <Spinner />;
  if (voucher.error) return <ErrorState error={voucher.error} />;
  const v = voucher.data!;
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/purchasing/vouchers`} className="text-sm text-stone-500 hover:underline">&larr; Payment vouchers</Link>
      <PageHeader title={`Payment voucher ${v.number}`} description={v.supplier_name} guide="payment-vouchers"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/w/${slug}/purchasing/vouchers/${v.id}/print`}><Button variant="secondary"><Printer className="h-4 w-4" /> Print</Button></Link>
            {(v.status === "draft" || v.status === "approved") && can("paymentvouchers.create") && <Button variant="ghost" className="text-red-600" onClick={() => void ask("Cancel this voucher?").then((ok) => ok && act.mutate("cancel"))}>Cancel</Button>}
            {v.status === "draft" && can("paymentvouchers.approve") && !approval.data?.required && <Button loading={act.isPending} onClick={() => act.mutate("approve")}>Approve</Button>}
            {v.status === "approved" && can("supplierpayments.create") && <Button onClick={() => { act.reset(); setPaying(true); }}>Record payment</Button>}
          </div>
        } />
      <RelatedDocuments kind="payment_voucher" id={id} />
      <ApprovalPanel docType="payment_voucher" id={id} />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-4">
        <Meta label="Status"><Badge tone={PV_STATUS[v.status ?? "draft"].tone}>{PV_STATUS[v.status ?? "draft"].label}</Badge></Meta>
        <Meta label="Bills">{fmt(v.total)}</Meta>
        <Meta label="Withholding tax">{fmt(v.withholding_amount)}</Meta>
        <Meta label="To pay">{fmt(v.net_payable)}</Meta>
        <Meta label="Prepared by">{v.prepared_by_name ?? "-"}</Meta>
        <Meta label="Approved by">{v.approved_by_name ? `${v.approved_by_name}, ${fmtDate(v.approved_at)}` : "-"}</Meta>
        {v.payment_id && <Meta label="Paid as"><Link className="font-mono text-xs hover:underline" href={`/w/${slug}/purchasing/payments/${v.payment_id}`}>{v.payment_number}</Link></Meta>}
        {v.supplier_bank_details && <Meta label="Pay to">{v.supplier_bank_details}</Meta>}
        {v.notes && <div className="sm:col-span-4"><Meta label="Why">{v.notes}</Meta></div>}
      </Card>
      <Card>
        <Table head={["Their invoice", "Date", "Paying"]}>
          {v.lines.map((l) => <tr key={l.bill_id}><Td><Link className="font-mono text-xs hover:underline" href={`/w/${slug}/purchasing/bills/${l.bill_id}`}>{l.bill_number}</Link></Td><Td>{fmtDate(l.bill_date)}</Td><Td className="text-right font-mono">{fmt(l.amount)}</Td></tr>)}
        </Table>
      </Card>
      <Modal open={paying} title={`Pay ${fmt(v.net_payable)} to ${v.supplier_name}`} onClose={() => setPaying(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); act.mutate("pay"); }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Paid on"><Input type="date" required value={pay.payment_date} onChange={(e) => setPay((p) => ({ ...p, payment_date: e.target.value }))} /></Field>
            <Field label="Method"><Select value={pay.method} onChange={(e) => setPay((p) => ({ ...p, method: e.target.value, paid_from_id: "" }))}>{PAY_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
            <Field label="Paid from" error={fieldError(act.error, "paid_from_id")}>
              <Select value={pay.paid_from_id || depositFor(accounts.data, pay.method)} onChange={(e) => setPay((p) => ({ ...p, paid_from_id: e.target.value }))}>
                {accounts.data.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
              </Select>
            </Field>
            <Field label={pay.method === "cheque" ? "Cheque number" : pay.method === "mpesa" ? "M-Pesa code" : "Reference"}><Input required={pay.method === "cheque" || pay.method === "mpesa"} value={pay.reference} onChange={(e) => setPay((p) => ({ ...p, reference: e.target.value }))} /></Field>
          </div>
          <FormError error={act.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setPaying(false)}>Cancel</Button><Button type="submit" loading={act.isPending}>Record payment</Button></div>
        </form>
      </Modal>
    </div>
  );
}
