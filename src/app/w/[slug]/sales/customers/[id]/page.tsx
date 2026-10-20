"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { CustomerForm } from "@/components/customer-form";
import { ShareLinkModal } from "@/components/share-link";
import { Meta } from "@/components/document-view";
import { Button, Card, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate, fmtNonZero } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

const KIND: Record<string, readonly [string, string]> = { invoice: ["Invoice", "invoices"], debit_note: ["Debit note", "invoices"], payment: ["Payment", "payments"], credit_note: ["Credit note", "credit-notes"] };

export default function CustomerPage() {
  const { slug, can, context } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const [from, setFrom] = useState("");
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const loyalty = useQuery({
    queryKey: ["loyalty-members", slug, "customer", id],
    enabled: can("loyalty.view"),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/loyalty/members/", { params: { path: { workspace: slug }, query: { customer: id } } })),
  });
  const member = loyalty.data?.results[0];
  const statement = useQuery({
    queryKey: ["customer-statement", slug, id, from],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/customers/{id}/statement/", { params: { path: { workspace: slug, id }, query: { from: from || undefined } } })),
  });
  if (statement.isLoading) return <Spinner />;
  if (statement.error) return <ErrorState error={statement.error} />;
  const { customer: c, rows, opening_balance, closing_balance } = statement.data!;

  return (
    <div className="w-full">
      <Link href={`/w/${slug}/sales/customers`} className="text-sm text-stone-500 hover:underline">&larr; Customers</Link>
      <PageHeader
        title={c.name}
        description={`${c.number}${c.city ? ` · ${c.city}` : ""}`}
        guide="customers"
        actions={
          <div className="flex gap-2">
            {can("customers.manage") && <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>}
            {can("customers.manage") && <Button variant="secondary" onClick={() => setSharing(true)}>Share statement</Button>}
            {can("payments.create") && <Link href={`/w/${slug}/sales/payments/new?customer=${c.id}`}><Button variant="secondary">Record payment</Button></Link>}
            {can("invoices.create") && <Link href={`/w/${slug}/sales/invoices/new?customer=${c.id}`}><Button>New invoice</Button></Link>}
          </div>
        }
      />
      <Card className="mb-6 grid gap-4 p-4 sm:grid-cols-4">
        <Meta label="Owes you">{fmt(c.balance)} {context.workspace.currency}</Meta>
        <Meta label="Phone">{c.phone || "-"}</Meta>
        <Meta label="KRA PIN">{c.kra_pin || "-"}</Meta>
        <Meta label="Pays within">{c.payment_terms_days ? `${c.payment_terms_days} days` : "On receipt"}</Meta>
        {c.price_list_name && <Meta label="Price list">{c.price_list_name}</Meta>}
        {member && <Meta label="Loyalty"><Link className="hover:underline" href={`/w/${slug}/sales/loyalty/${member.id}`}>{member.points_balance} points{member.tier_name ? ` · ${member.tier_name}` : ""}</Link></Meta>}
      </Card>
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-sm font-semibold">Statement</h2>
        <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
      </div>
      <Card>
        <Table head={["Date", "Document", "Charged", "Paid or credited", "Balance"]}>
          {from && <tr className="bg-stone-50"><Td colSpan={4}>Brought forward</Td><Td className="text-right font-mono">{fmt(opening_balance)}</Td></tr>}
          {rows.map((r) => (
            <tr key={`${r.kind}-${r.document_id}`}>
              <Td>{fmtDate(r.date)}</Td>
              <Td><Link className="hover:underline" href={`/w/${slug}/sales/${KIND[r.kind][1]}/${r.document_id}`}>{KIND[r.kind][0]} <span className="font-mono text-xs">{r.number}</span></Link></Td>
              <Td className="text-right font-mono">{fmtNonZero(r.debit)}</Td>
              <Td className="text-right font-mono">{fmtNonZero(r.credit)}</Td>
              <Td className="text-right font-mono">{fmt(r.balance)}</Td>
            </tr>
          ))}
          {rows.length === 0 && <tr><Td colSpan={5}><EmptyState title="Nothing on the statement yet" /></Td></tr>}
          <tr className="bg-stone-50 font-semibold"><Td colSpan={4}>Balance</Td><Td className="text-right font-mono">{fmt(closing_balance)}</Td></tr>
        </Table>
      </Card>
      <ShareLinkModal open={sharing} onClose={() => setSharing(false)} customerId={c.id} label="Your statement" />
      <Modal size="lg" open={editing} title={`Edit ${c.name}`} onClose={() => setEditing(false)}>
        <CustomerForm customer={c} onSaved={() => { toast.success("Customer saved"); setEditing(false); }} onCancel={() => setEditing(false)} />
      </Modal>
    </div>
  );
}
