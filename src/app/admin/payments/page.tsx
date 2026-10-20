"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { PAYMENT_STATUS } from "@/lib/api/platform";
import { fmt, fmtDate } from "@/lib/format";

function Payments() {
  const params = useSearchParams();
  const [reconcile, setReconcile] = useState(params.get("reconcile") === "true");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [acting, setActing] = useState<{ id: string; action: "complete" | "fail" | "refund" } | null>(null);
  const list = useQuery({
    queryKey: ["platform-payments", reconcile, status, search],
    queryFn: async () => unwrap(await api.GET("/api/v1/platform/payments/", { params: { query: { reconcile: reconcile ? "true" : undefined, status: status || undefined, search: search || undefined, page_size: 100 } as never } })),
  });
  const rows = list.data?.results ?? [];
  return (
    <div className="w-full">
      <PageHeader title="Subscription payments" description="M-Pesa prompts, paybill payments and payments recorded by staff. Reconcile the ones that need a person." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reconcile} onChange={(e) => setReconcile(e.target.checked)} /> Only those to reconcile</label>
        <Select className="max-w-40" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Any status</option>{Object.entries(PAYMENT_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</Select>
        <Input className="max-w-xs" placeholder="M-Pesa code, account number, business" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? <EmptyState title={reconcile ? "Nothing to reconcile" : "No payments"} /> : (
          <Table head={["Date", "Business", "Plan", "Amount", "Reference", "Status", ""]}>
            {rows.map((p) => (
              <tr key={p.id}>
                <Td>{fmtDate(p.paid_at ?? p.created_at)}</Td>
                <Td><Link href={`/admin/businesses/${p.business_slug}`} className="hover:underline">{p.business}</Link><div className="font-mono text-xs text-stone-500">{p.account_number}</div></Td>
                <Td>{p.plan_name}, {p.periods} {p.cycle === "yearly" ? "yr" : "mo"}</Td>
                <Td className="text-right font-mono">{fmt(p.amount)}</Td>
                <Td className="font-mono text-xs">{p.reference || p.method}</Td>
                <Td><Badge tone={PAYMENT_STATUS[p.status ?? "pending"]?.[1]}>{PAYMENT_STATUS[p.status ?? "pending"]?.[0]}</Badge>{p.note && <div className="max-w-56 text-xs text-stone-500">{p.note}</div>}</Td>
                <Td className="whitespace-nowrap text-xs">
                  {p.status === "pending" && <><button type="button" className="text-brand-700 hover:underline" onClick={() => setActing({ id: p.id, action: "complete" })}>Complete</button> · <button type="button" className="text-stone-600 hover:underline" onClick={() => setActing({ id: p.id, action: "fail" })}>Failed</button></>}
                  {p.status === "completed" && <button type="button" className="text-red-600 hover:underline" onClick={() => setActing({ id: p.id, action: "refund" })}>Refund</button>}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {acting && <PaymentAction {...acting} onClose={() => setActing(null)} />}
    </div>
  );
}

function PaymentAction({ id, action, onClose }: { id: string; action: "complete" | "fail" | "refund"; onClose: () => void }) {
  const [f, setF] = useState({ periods: "1", reference: "", note: "" });
  const go = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/platform/payments/{id}/action/", { params: { path: { id } }, body: { action, ...(action === "complete" ? { periods: Number(f.periods), reference: f.reference } : {}), note: f.note } })),
    onSuccess: () => { toast.success("Saved"); onClose(); },
  });
  return (
    <Modal open title={{ complete: "Complete the payment", fail: "Mark failed", refund: "Refund" }[action]} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); go.mutate(); }}>
        {action === "complete" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Periods it pays for"><Input type="number" min={1} value={f.periods} onChange={(e) => setF((p) => ({ ...p, periods: e.target.value }))} /></Field>
            <Field label="Reference"><Input value={f.reference} onChange={(e) => setF((p) => ({ ...p, reference: e.target.value }))} /></Field>
          </div>
        )}
        {action === "refund" && <p className="text-sm text-stone-600">Send the money back yourself first (M-Pesa reversal or bank). This takes back the time it paid for, if it was the latest payment.</p>}
        <Field label="Note"><Input value={f.note} onChange={(e) => setF((p) => ({ ...p, note: e.target.value }))} /></Field>
        <FormError error={go.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={go.isPending}>Save</Button></div>
      </form>
    </Modal>
  );
}

export default function PaymentsPage() {
  return <Suspense><Payments /></Suspense>;
}
