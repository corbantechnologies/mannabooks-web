"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { ActionMenu } from "@/components/action-menu";
import { ActivityPanel } from "@/components/activity-panel";
import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { LEAD_SOURCES, LEAD_STATUS, useAssignees } from "@/lib/api/crm";
import { useCustomers } from "@/lib/api/sales";
import type { Lead } from "@/lib/api/types";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function LeadPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const path = { params: { path: { workspace: slug, id } } };
  const lead = useQuery({ queryKey: ["lead", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/leads/{id}/", path)) });
  const [editing, setEditing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [losing, setLosing] = useState(false);
  const act = useMutation({
    mutationFn: async (body: { action: "convert" | "lose" | "reopen"; customer_id?: string | null; deal_title?: string; deal_value?: string | null; reason?: string }) =>
      unwrap(await api.POST("/api/v1/w/{workspace}/leads/{id}/action/", { ...path, body })),
    onSuccess: (l) => { toast.success(l.status === "converted" ? `${l.customer_name} is now a customer` : l.status === "lost" ? "Marked lost" : "Reopened"); setConverting(false); setLosing(false); },
  });
  if (lead.isLoading) return <Spinner />;
  if (lead.error) return <ErrorState error={lead.error} />;
  const l = lead.data!;
  const manage = can("crm.manage");
  const open = l.status !== "converted" && l.status !== "lost";
  const [statusLabel, tone] = LEAD_STATUS[l.status ?? "new"];
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/crm/leads`} className="text-sm text-stone-500 hover:underline">&larr; Leads</Link>
      <PageHeader title={l.name} description={[l.company, l.number].filter(Boolean).join(" · ")} guide="crm"
        actions={manage && (
          <div className="flex flex-wrap gap-2">
            {open && <Button onClick={() => { act.reset(); setConverting(true); }}>Convert to customer</Button>}
            {l.status === "converted" && l.customer_id && <Link href={`/w/${slug}/sales/customers/${l.customer_id}`}><Button variant="secondary">Open customer</Button></Link>}
            <ActionMenu actions={[
              { label: "Edit", onClick: () => setEditing(true), hidden: !open },
              { label: "Mark lost", onClick: () => { act.reset(); setLosing(true); }, hidden: !open, danger: true },
              { label: "Reopen", onClick: () => act.mutate({ action: "reopen" }), hidden: l.status !== "lost" },
            ]} />
          </div>
        )} />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card className="space-y-2 p-5 text-sm">
          <p><Badge tone={tone}>{statusLabel}</Badge> {l.lost_reason && <span className="text-stone-500">{l.lost_reason}</span>}</p>
          {[["Phone", l.phone], ["Email", l.email], ["How they found you", LEAD_SOURCES.find(([k]) => k === l.source)?.[1]], ["Wants", l.interest],
            ["Likely value", Number(l.estimated_value) ? fmt(l.estimated_value) : ""], ["Follows up", l.assigned_to_name], ["Added", fmtDate(l.created_at)]]
            .filter(([, v]) => v).map(([k, v]) => <p key={k}><span className="text-stone-500">{k}: </span>{v}</p>)}
          {l.phone && <p className="flex gap-3 pt-1"><a className="text-brand-700 underline" href={`tel:${l.phone}`}>Call</a><a className="text-brand-700 underline" href={`https://wa.me/${l.phone.replace(/\D/g, "").replace(/^0/, "254")}`} target="_blank" rel="noreferrer">WhatsApp</a></p>}
          {l.notes && <p className="whitespace-pre-line border-t border-stone-100 pt-2 text-stone-700">{l.notes}</p>}
        </Card>
        <ActivityPanel lead={l.id} />
      </div>
      {editing && <EditLead lead={l} onClose={() => setEditing(false)} />}
      <ConvertDialog open={converting} lead={l} onClose={() => setConverting(false)} pending={act.isPending} error={act.error}
        onConvert={(body) => act.mutate({ action: "convert", ...body })} />
      <LoseDialog open={losing} onClose={() => setLosing(false)} pending={act.isPending} error={act.error} onLose={(reason) => act.mutate({ action: "lose", reason })} />
    </div>
  );
}

function EditLead({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const { slug } = useWorkspace();
  const assignees = useAssignees(slug);
  const [form, setForm] = useState({
    name: lead.name, company: lead.company ?? "", phone: lead.phone ?? "", email: lead.email ?? "", source: lead.source ?? "other", status: lead.status ?? "new",
    interest: lead.interest ?? "", estimated_value: String(Number(lead.estimated_value ?? 0)), assigned_to_id: lead.assigned_to_id ?? "", notes: lead.notes ?? "",
  });
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PATCH("/api/v1/w/{workspace}/leads/{id}/", {
      params: { path: { workspace: slug, id: lead.id } },
      body: { ...form, source: form.source as never, status: form.status as never, assigned_to_id: form.assigned_to_id || null },
    })),
    onSuccess: () => { toast.success("Lead saved"); onClose(); },
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));
  return (
    <Modal size="lg" open title={`Edit ${lead.name}`} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" error={fieldError(save.error, "name")}><Input required value={form.name} onChange={set("name")} /></Field>
          <Field label="Company"><Input value={form.company} onChange={set("company")} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={set("phone")} /></Field>
          <Field label="Email" error={fieldError(save.error, "email")}><Input type="email" value={form.email} onChange={set("email")} /></Field>
          <Field label="How they found you"><Select value={form.source} onChange={set("source")}>{LEAD_SOURCES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
          <Field label="Stage" error={fieldError(save.error, "status")}>
            <Select value={form.status} onChange={set("status")}>{["new", "contacted", "qualified"].map((k) => <option key={k} value={k}>{LEAD_STATUS[k][0]}</option>)}</Select>
          </Field>
          <Field label="Likely value"><Input inputMode="decimal" value={form.estimated_value} onChange={set("estimated_value")} /></Field>
          {assignees.length > 0 && <Field label="Who follows up"><Select value={form.assigned_to_id} onChange={set("assigned_to_id")}><option value="">Nobody yet</option>{assignees.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>}
        </div>
        <Field label="What they want"><Input value={form.interest} onChange={set("interest")} /></Field>
        <Field label="Notes"><Textarea rows={3} value={form.notes} onChange={set("notes")} /></Field>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
      </form>
    </Modal>
  );
}

function ConvertDialog({ open, lead, onClose, onConvert, pending, error }: {
  open: boolean; lead: Lead; onClose: () => void; pending: boolean; error: unknown;
  onConvert: (body: { customer_id: string | null; deal_title: string; deal_value: string | null }) => void;
}) {
  const { slug } = useWorkspace();
  const customers = useCustomers(slug);
  const [existing, setExisting] = useState("");
  const [deal, setDeal] = useState(true);
  const [title, setTitle] = useState(lead.interest || `${lead.company || lead.name} order`);
  const [value, setValue] = useState(String(Number(lead.estimated_value ?? 0) || ""));
  return (
    <Modal open={open} title="Convert to customer" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onConvert({ customer_id: existing || null, deal_title: deal ? title : "", deal_value: deal && value ? value : null }); }}>
        <Field label="Customer" hint="A new customer gets the lead's name, phone and email.">
          <Select value={existing} onChange={(e) => setExisting(e.target.value)}>
            <option value="">New customer: {lead.company || lead.name}</option>
            {(customers.data?.results ?? []).map((c) => <option key={c.id} value={c.id}>Existing: {c.name}</option>)}
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={deal} onChange={(e) => setDeal(e.target.checked)} /> Also open a deal in the pipeline</label>
        {deal && (
          <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
            <Field label="Deal"><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            <Field label="Value"><Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
          </div>
        )}
        <FormError error={error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={pending}>Convert</Button></div>
      </form>
    </Modal>
  );
}

function LoseDialog({ open, onClose, onLose, pending, error }: { open: boolean; onClose: () => void; onLose: (reason: string) => void; pending: boolean; error: unknown }) {
  const [reason, setReason] = useState("");
  return (
    <Modal open={open} title="Mark lost" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onLose(reason); }}>
        <Field label="Why?" hint="For example: bought elsewhere, too expensive, no reply."><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <FormError error={error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" variant="danger" loading={pending}>Mark lost</Button></div>
      </form>
    </Modal>
  );
}
