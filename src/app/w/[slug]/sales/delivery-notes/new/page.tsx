"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import toast from "react-hot-toast";

import { DeliveryLine, DeliveryLinesEditor, blankDeliveryLine } from "@/components/delivery-lines";
import { Button, Card, Field, FormError, Input, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { useCustomers } from "@/lib/api/sales";
import type { Invoice } from "@/lib/api/types";
import { todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

function Form({ invoice }: { invoice?: Invoice }) {
  const { slug } = useWorkspace();
  const router = useRouter();
  const customers = useCustomers(slug);
  const [head, setHead] = useState({
    customer_id: invoice?.customer_id ?? "", delivery_date: todayIso(), delivery_address: "", contact_person: "", contact_phone: "",
    vehicle: "", driver: "", notes: "",
  });
  const [lines, setLines] = useState<DeliveryLine[]>(
    invoice?.lines?.length ? invoice.lines.map((l) => ({ product_id: l.product_id ?? "", description: l.description ?? "", quantity: String(Number(l.quantity)), unit: "" })) : [blankDeliveryLine()],
  );
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/delivery-notes/", {
      ...wsPath(slug),
      body: {
        ...head, invoice_id: invoice?.id ?? null,
        lines: lines.filter((l) => l.description || l.product_id).map((l) => ({ product_id: l.product_id || null, description: l.description, quantity: l.quantity || "1", unit: l.unit })),
      },
    })),
    onSuccess: (d) => { toast.success(`Delivery note ${d.number} saved`); router.push(`/w/${slug}/sales/delivery-notes/${d.id}`); },
  });
  const set = (key: keyof typeof head) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setHead((prev) => ({ ...prev, [key]: e.target.value }));
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <Card className="grid gap-3 p-4 sm:grid-cols-4">
        <div className="sm:col-span-2">
          {invoice ? (
            <div className="text-sm"><p className="text-stone-500">Delivering invoice</p><p className="font-medium">{invoice.number} · {invoice.customer_name}</p></div>
          ) : (
            <Field label="Customer" error={fieldError(save.error, "customer_id")}>
              <Select required value={head.customer_id} onChange={set("customer_id")}>
                <option value="">Choose a customer</option>
                {(customers.data?.results ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          )}
        </div>
        <Field label="Delivery date"><Input type="date" required value={head.delivery_date} onChange={set("delivery_date")} /></Field>
        <Field label="Vehicle"><Input value={head.vehicle} onChange={set("vehicle")} placeholder="KDA 123A" /></Field>
        <Field label="Driver"><Input value={head.driver} onChange={set("driver")} /></Field>
        <Field label="Contact person"><Input value={head.contact_person} onChange={set("contact_person")} /></Field>
        <Field label="Contact phone"><Input value={head.contact_phone} onChange={set("contact_phone")} /></Field>
        <div className="sm:col-span-4"><Field label="Delivery address" hint="Blank: the customer's address."><Textarea rows={2} value={head.delivery_address} onChange={set("delivery_address")} /></Field></div>
      </Card>
      <DeliveryLinesEditor slug={slug} lines={lines} setLines={setLines} />
      <Field label="Notes"><Textarea value={head.notes} onChange={set("notes")} /></Field>
      <FormError error={save.error} />
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button><Button type="submit" loading={save.isPending}>Save delivery note</Button></div>
    </form>
  );
}

function NewDeliveryNote() {
  const { slug } = useWorkspace();
  const invoiceId = useSearchParams().get("invoice");
  const invoice = useQuery({
    queryKey: ["invoice", slug, invoiceId],
    enabled: Boolean(invoiceId),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/invoices/{id}/", { params: { path: { workspace: slug, id: invoiceId! } } })),
  });
  return (
    <div className="max-w-5xl">
      <Link href={`/w/${slug}/sales/delivery-notes`} className="text-sm text-stone-500 hover:underline">&larr; Delivery notes</Link>
      <PageHeader title="New delivery note" guide="delivery-notes" />
      {invoiceId && invoice.isLoading ? <Spinner /> : <Form invoice={invoice.data} />}
    </div>
  );
}

export default function NewDeliveryNotePage() {
  return <Suspense><NewDeliveryNote /></Suspense>;
}
