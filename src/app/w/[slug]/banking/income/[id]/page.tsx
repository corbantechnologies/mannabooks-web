"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Meta } from "@/components/document-view";
import { TagsMeta } from "@/components/tag-pickers";
import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function IncomePage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const path = { params: { path: { workspace: slug, id } } };
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const x = useQuery({ queryKey: ["other-income", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/other-income/{id}/", path)) });
  const voidIt = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/other-income/{id}/void/", { ...path, body: { reason } })),
    onSuccess: () => { toast.success("Voided"); setVoiding(false); },
  });
  if (x.isLoading) return <Spinner />;
  if (x.error) return <ErrorState error={x.error} />;
  const r = x.data!;
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/banking/income`} className="text-sm text-stone-500 hover:underline">&larr; Other income</Link>
      <PageHeader title={`Income ${r.number}`} description={r.payer} guide="other-income"
        actions={r.status === "posted" && can("banking.receive") && <Button variant="secondary" onClick={() => { voidIt.reset(); setVoiding(true); }}>Void</Button>} />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-4">
        <Meta label="Date">{fmtDate(r.income_date)}</Meta><Meta label="Into">{r.received_into_name}</Meta><Meta label="Total">{fmt(r.total)}</Meta>
        <Meta label="Status">{r.status === "void" ? <Badge>Void: {r.void_reason}</Badge> : <Badge tone="green">Posted</Badge>}</Meta>
        <TagsMeta doc={r} />
      </Card>
      <Card><Table head={["Description", "Account", "Before VAT", "VAT"]}>{r.lines.map((l) => <tr key={l.id}><Td>{l.description}</Td><Td>{l.account_name}</Td><Td className="text-right font-mono">{fmt(l.net_amount)}</Td><Td className="text-right font-mono">{fmt(l.tax_amount)}</Td></tr>)}</Table></Card>
      <Modal open={voiding} title={`Void ${r.number}`} onClose={() => setVoiding(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); voidIt.mutate(); }}>
          <Field label="Reason"><Input required value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <FormError error={voidIt.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setVoiding(false)}>Cancel</Button><Button type="submit" variant="danger" loading={voidIt.isPending}>Void</Button></div>
        </form>
      </Modal>
    </div>
  );
}
