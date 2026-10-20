"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Meta } from "@/components/document-view";
import { SupplierForm } from "@/components/supplier-form";
import { Button, Card, EmptyState, ErrorState, Modal, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate, fmtNonZero } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function SupplierPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const [editing, setEditing] = useState(false);
  const st = useQuery({ queryKey: ["supplier-statement", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/suppliers/{id}/statement/", { params: { path: { workspace: slug, id } } })) });
  if (st.isLoading) return <Spinner />;
  if (st.error) return <ErrorState error={st.error} />;
  const { supplier: s, rows, closing_balance } = st.data!;
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/purchasing/suppliers`} className="text-sm text-stone-500 hover:underline">&larr; Suppliers</Link>
      <PageHeader title={s.name} description={s.number} guide="suppliers"
        actions={
          <div className="flex flex-wrap gap-2">
            {can("suppliers.manage") && <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>}
            {can("purchaseorders.create") && <Link href={`/w/${slug}/purchasing/orders/new?supplier=${s.id}`}><Button variant="secondary">New order</Button></Link>}
            {can("bills.create") && <Link href={`/w/${slug}/purchasing/bills/new?supplier=${s.id}`}><Button variant="secondary">Enter bill</Button></Link>}
            {can("paymentvouchers.create") && <Link href={`/w/${slug}/purchasing/vouchers/new?supplier=${s.id}`}><Button>Pay</Button></Link>}
          </div>
        } />
      <Card className="mb-6 grid gap-4 p-4 sm:grid-cols-4">
        <Meta label="You owe">{fmt(s.balance)}</Meta>
        <Meta label="Phone">{s.phone || "-"}</Meta>
        <Meta label="KRA PIN">{s.kra_pin || "-"}</Meta>
        <Meta label="Withholding tax">{s.withholding_tax_rate_name ?? "None"}</Meta>
        {s.bank_details && <Meta label="Pay to">{s.bank_details}</Meta>}
      </Card>
      <h2 className="mb-2 text-sm font-semibold">Statement</h2>
      <Card>
        <Table head={["Date", "Document", "Their ref.", "Billed", "Paid", "Balance"]}>
          {rows.map((r) => (
            <tr key={`${r.kind}-${r.document_id}`}>
              <Td>{fmtDate(r.date)}</Td>
              <Td><Link className="hover:underline" href={`/w/${slug}/purchasing/${r.kind === "bill" ? "bills" : "payments"}/${r.document_id}`}>{r.kind === "bill" ? "Bill" : "Payment"} <span className="font-mono text-xs">{r.number}</span></Link></Td>
              <Td className="text-stone-500">{r.reference}</Td>
              <Td className="text-right font-mono">{fmtNonZero(r.billed)}</Td>
              <Td className="text-right font-mono">{fmtNonZero(r.paid)}</Td>
              <Td className="text-right font-mono">{fmt(r.balance)}</Td>
            </tr>
          ))}
          {rows.length === 0 && <tr><Td colSpan={6}><EmptyState title="No bills or payments yet" /></Td></tr>}
          <tr className="bg-stone-50 font-semibold"><Td colSpan={5}>Balance owed</Td><Td className="text-right font-mono">{fmt(closing_balance)}</Td></tr>
        </Table>
      </Card>
      <Modal size="lg" open={editing} title={`Edit ${s.name}`} onClose={() => setEditing(false)}>
        <SupplierForm supplier={s} onSaved={() => { toast.success("Supplier saved"); setEditing(false); }} onCancel={() => setEditing(false)} />
      </Modal>
    </div>
  );
}
