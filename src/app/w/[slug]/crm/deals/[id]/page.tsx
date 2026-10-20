"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { ActionMenu } from "@/components/action-menu";
import { ActivityPanel } from "@/components/activity-panel";
import { DealForm } from "@/components/deal-form";
import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { STAGES, stageLabel } from "@/lib/api/crm";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function DealPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const path = { params: { path: { workspace: slug, id } } };
  const deal = useQuery({ queryKey: ["deal", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/deals/{id}/", path)) });
  const [editing, setEditing] = useState(false);
  const [losing, setLosing] = useState(search.get("lose") === "1");
  const [linking, setLinking] = useState(false);
  const move = useMutation({
    mutationFn: async (body: { stage: string; lost_reason?: string }) => unwrap(await api.POST("/api/v1/w/{workspace}/deals/{id}/move/", { ...path, body: body as never })),
    onSuccess: (d) => { toast.success(`Moved to ${stageLabel(d.stage)}`); setLosing(false); },
    onError: (e) => toast.error(e.message),
  });
  if (deal.isLoading) return <Spinner />;
  if (deal.error) return <ErrorState error={deal.error} />;
  const d = deal.data!;
  const manage = can("crm.manage");
  const closed = d.stage === "won" || d.stage === "lost";
  const next = STAGES[STAGES.findIndex(([k]) => k === d.stage) + 1]?.[0];
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/crm`} className="text-sm text-stone-500 hover:underline">&larr; Pipeline</Link>
      <PageHeader title={d.title} description={[d.number, d.customer_name ?? d.lead_name].filter(Boolean).join(" · ")} guide="crm"
        actions={manage && (
          <div className="flex flex-wrap gap-2">
            {!closed && d.customer_id && !d.quotation_id && can("quotations.manage") && (
              <Link href={`/w/${slug}/sales/quotations/new?customer=${d.customer_id}&deal=${d.id}`}><Button>Make a quotation</Button></Link>
            )}
            {!closed && next && next !== "lost" && <Button variant="secondary" loading={move.isPending} onClick={() => move.mutate({ stage: next })}>Move to {stageLabel(next)}</Button>}
            <ActionMenu actions={[
              { label: "Edit", onClick: () => setEditing(true) },
              { label: "Link an existing quotation", onClick: () => setLinking(true), hidden: closed || !d.customer_id },
              { label: "Mark won", onClick: () => move.mutate({ stage: "won" }), hidden: closed },
              { label: "Mark lost", onClick: () => setLosing(true), hidden: closed, danger: true },
              { label: "Reopen", onClick: () => move.mutate({ stage: "negotiation" }), hidden: !closed },
            ]} />
          </div>
        )} />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card className="space-y-2 p-5 text-sm">
          <p><Badge tone={d.stage === "won" ? "green" : d.stage === "lost" ? "stone" : "blue"}>{stageLabel(d.stage)}</Badge> {d.lost_reason && <span className="text-stone-500">{d.lost_reason}</span>}</p>
          {manage && !closed && (
            <div className="flex flex-wrap gap-1 py-1">
              {STAGES.filter(([k]) => k !== "won" && k !== "lost").map(([k, l]) => (
                <button key={k} type="button" disabled={move.isPending} onClick={() => k !== d.stage && move.mutate({ stage: k })}
                  className={`rounded-full border px-2.5 py-0.5 text-xs ${k === d.stage ? "border-brand-600 bg-brand-50 font-medium text-brand-700" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}>{l}</button>
              ))}
            </div>
          )}
          {[["Value", fmt(d.value)], ["Chance", `${d.chance}%${d.probability == null ? " (the stage's usual)" : ""}`], ["Likely value", fmt(d.weighted_value)],
            ["Expected to close", d.expected_close_date ? fmtDate(d.expected_close_date) : ""], ["Closed", d.closed_at ? fmtDate(d.closed_at) : ""],
            ["Working it", d.assigned_to_name ?? ""]].filter(([, v]) => v).map(([k, v]) => <p key={k}><span className="text-stone-500">{k}: </span>{v}</p>)}
          {d.customer_id && <p><span className="text-stone-500">Customer: </span><Link className="text-brand-700 underline" href={`/w/${slug}/sales/customers/${d.customer_id}`}>{d.customer_name}</Link></p>}
          {d.lead_id && <p><span className="text-stone-500">From lead: </span><Link className="text-brand-700 underline" href={`/w/${slug}/crm/leads/${d.lead_id}`}>{d.lead_name}</Link></p>}
          {d.quotation_id && <p><span className="text-stone-500">Quotation: </span><Link className="text-brand-700 underline" href={`/w/${slug}/sales/quotations/${d.quotation_id}`}>{d.quotation_number}</Link> <span className="text-stone-500">({d.quotation_status})</span></p>}
          {d.notes && <p className="whitespace-pre-line border-t border-stone-100 pt-2 text-stone-700">{d.notes}</p>}
          {!closed && d.quotation_id && <p className="text-xs text-stone-500">When the quotation is turned into an invoice, this deal is marked won.</p>}
        </Card>
        <ActivityPanel deal={d.id} />
      </div>
      {editing && <DealForm open deal={d} onClose={() => setEditing(false)} />}
      <LoseDialog open={losing} onClose={() => setLosing(false)} pending={move.isPending} error={move.error} onLose={(lost_reason) => move.mutate({ stage: "lost", lost_reason })} />
      {linking && d.customer_id && <LinkQuotation dealId={d.id} customerId={d.customer_id} onClose={() => setLinking(false)} />}
    </div>
  );
}

function LoseDialog({ open, onClose, onLose, pending, error }: { open: boolean; onClose: () => void; onLose: (reason: string) => void; pending: boolean; error: unknown }) {
  const [reason, setReason] = useState("");
  return (
    <Modal open={open} title="Mark the deal lost" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onLose(reason); }}>
        <Field label="Why was it lost?" hint="For example: price, went with a competitor, project cancelled."><Input required value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <FormError error={error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" variant="danger" loading={pending}>Mark lost</Button></div>
      </form>
    </Modal>
  );
}

function LinkQuotation({ dealId, customerId, onClose }: { dealId: string; customerId: string; onClose: () => void }) {
  const { slug } = useWorkspace();
  const [quotation, setQuotation] = useState("");
  const quotes = useQuery({
    queryKey: ["quotations", slug, "for-deal", customerId],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/quotations/", { params: { path: { workspace: slug }, query: { customer: customerId, page_size: 50 } } })),
  });
  const link = useMutation({
    mutationFn: async () => unwrap(await api.PATCH("/api/v1/w/{workspace}/deals/{id}/", { params: { path: { workspace: slug, id: dealId } }, body: { quotation_id: quotation } })),
    onSuccess: () => { toast.success("Quotation linked"); onClose(); },
  });
  return (
    <Modal open title="Link a quotation" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); link.mutate(); }}>
        <Field label="Quotation" hint="The customer's quotations. Linking one moves the deal to Quote sent.">
          <Select required value={quotation} onChange={(e) => setQuotation(e.target.value)}>
            <option value="">Choose</option>
            {(quotes.data?.results ?? []).map((q) => <option key={q.id} value={q.id}>{q.number} · {fmt(q.total)} · {q.status}</option>)}
          </Select>
        </Field>
        <FormError error={link.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={link.isPending}>Link</Button></div>
      </form>
    </Modal>
  );
}
