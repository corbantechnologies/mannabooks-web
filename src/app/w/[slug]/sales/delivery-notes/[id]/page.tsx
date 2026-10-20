"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { RelatedDocuments } from "@/components/related-documents";
import { Meta } from "@/components/document-view";
import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { DELIVERY_STATUS } from "@/lib/api/sales";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

type Status = keyof typeof DELIVERY_STATUS;

export default function DeliveryNotePage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const path = { params: { path: { workspace: slug, id } } };
  const [receiving, setReceiving] = useState(false);
  const [receivedBy, setReceivedBy] = useState("");
  const note = useQuery({ queryKey: ["delivery-note", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/delivery-notes/{id}/", path)) });
  const act = useMutation({
    mutationFn: async (action: "dispatch" | "deliver" | "void") => unwrap(await api.POST("/api/v1/w/{workspace}/delivery-notes/{id}/status/", { ...path, body: { action, received_by: receivedBy } })),
    onSuccess: (d) => { toast.success(`Marked ${DELIVERY_STATUS[d.status as Status].label.toLowerCase()}`); setReceiving(false); },
    onError: (e) => toast.error(e.message),
  });
  if (note.isLoading) return <Spinner />;
  if (note.error) return <ErrorState error={note.error} />;
  const d = note.data!;
  const manage = can("deliverynotes.manage");
  const live = d.status === "draft" || d.status === "dispatched";
  return (
    <div className="max-w-5xl">
      <Link href={`/w/${slug}/sales/delivery-notes`} className="text-sm text-stone-500 hover:underline">&larr; Delivery notes</Link>
      <PageHeader
        title={`Delivery note ${d.number}`}
        description={d.customer_name}
        guide="delivery-notes"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/w/${slug}/sales/delivery-notes/${d.id}/print`}><Button variant="secondary"><Printer className="h-4 w-4" /> Print</Button></Link>
            {manage && live && <Button variant="ghost" className="text-red-600" onClick={() => confirm("Void this delivery note?") && act.mutate("void")}>Void</Button>}
            {manage && d.status === "draft" && <Button variant="secondary" loading={act.isPending} onClick={() => act.mutate("dispatch")}>Mark dispatched</Button>}
            {manage && live && <Button onClick={() => { act.reset(); setReceiving(true); }}>Mark delivered</Button>}
          </div>
        }
      />
      <RelatedDocuments kind="delivery_note" id={id} />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-4">
        <Meta label="Status"><Badge tone={DELIVERY_STATUS[d.status as Status].tone}>{DELIVERY_STATUS[d.status as Status].label}</Badge></Meta>
        <Meta label="Date">{fmtDate(d.delivery_date)}</Meta>
        <Meta label="Invoice">{d.invoice_id ? <Link className="font-mono text-xs hover:underline" href={`/w/${slug}/sales/invoices/${d.invoice_id}`}>{d.invoice_number}</Link> : "-"}</Meta>
        <Meta label="Vehicle / driver">{[d.vehicle, d.driver].filter(Boolean).join(" · ") || "-"}</Meta>
        <Meta label="Deliver to">{d.delivery_address || "-"}</Meta>
        <Meta label="Contact">{[d.contact_person, d.contact_phone].filter(Boolean).join(" · ") || "-"}</Meta>
        {d.received_by && <Meta label="Received by">{d.received_by}{d.delivered_at ? ` · ${fmtDate(d.delivered_at)}` : ""}</Meta>}
      </Card>
      <Card>
        <Table head={["Description", "Qty", "Unit"]}>
          {(d.lines ?? []).map((l) => (
            <tr key={l.id}><Td>{l.description}</Td><Td className="text-right font-mono">{Number(l.quantity)}</Td><Td>{l.unit}</Td></tr>
          ))}
        </Table>
      </Card>
      {d.notes && <p className="mt-4 whitespace-pre-line text-sm text-stone-600">{d.notes}</p>}
      <Modal open={receiving} title="Mark delivered" onClose={() => setReceiving(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); act.mutate("deliver"); }}>
          <Field label="Received by" hint="The name on the signed copy."><Input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} /></Field>
          <FormError error={act.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setReceiving(false)}>Cancel</Button><Button type="submit" loading={act.isPending}>Mark delivered</Button></div>
        </form>
      </Modal>
    </div>
  );
}
