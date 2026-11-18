"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { ask } from "@/components/confirm";
import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { fmtDate } from "@/lib/format";

type Application = components["schemas"]["Application"];
const STATUS: Record<string, { label: string; tone: "amber" | "blue" | "green" | "stone" }> = {
  new: { label: "New", tone: "amber" }, contacted: { label: "Contacted", tone: "blue" }, approved: { label: "Approved", tone: "green" }, declined: { label: "Declined", tone: "stone" },
};

/** Founding-customer applications from mannabooks.co.ke/founding: call them, then approve (emails the code) or decline. */
export default function FoundingAdminPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [industry, setIndustry] = useState("");
  const [open, setOpen] = useState<Application | null>(null);
  const [settings, setSettings] = useState(false);
  const list = useQuery({
    queryKey: ["founding-applications", status, industry],
    queryFn: async () => unwrap(await api.GET("/api/v1/platform/founding/", { params: { query: { status: status || undefined, industry: industry || undefined, page_size: 200 } as never } })),
  });
  const places = useQuery({ queryKey: ["founding-places"], queryFn: async () => unwrap(await api.GET("/api/v1/platform/founding/places/")) });
  const prog = useQuery({ queryKey: ["founding-settings"], queryFn: async () => unwrap(await api.GET("/api/v1/platform/founding/settings/")) });
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["founding-applications"] }); void qc.invalidateQueries({ queryKey: ["founding-places"] }); };
  const rows = list.data?.results ?? [];
  return (
    <div className="space-y-5">
      <PageHeader title="Founding customers" description="Applications from the founding page. Call each business, then approve (they're emailed the code and a sign-up link) or decline."
        actions={<div className="flex gap-2">
          <Link href="/founding" target="_blank" className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50">Open the page <ExternalLink className="h-3.5 w-3.5" /></Link>
          <Button variant="secondary" onClick={() => setSettings(true)}>Settings</Button>
        </div>} />
      {prog.data && (
        <p className="text-sm text-stone-600">
          {prog.data.is_open ? <Badge tone="green">Open</Badge> : <Badge>Closed</Badge>} {prog.data.offer} with code <span className="font-mono">{prog.data.coupon_code}</span>, {prog.data.places_per_industry} places per industry.
          Make sure the code exists under <Link className="underline" href="/admin/coupons">Coupons</Link>.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {(places.data ?? []).map((p) => (
          <button key={p.industry} type="button" onClick={() => setIndustry(industry === p.industry ? "" : p.industry)}
            className={`rounded-lg border bg-white p-3 text-left ${industry === p.industry ? "border-brand-500 ring-1 ring-brand-500" : "border-stone-200 hover:border-stone-300"}`}>
            <p className="truncate text-xs text-stone-500" title={p.label}>{p.label}</p>
            <p className="text-lg font-semibold text-stone-900">{p.total - p.left}<span className="text-sm font-normal text-stone-500"> / {p.total}</span></p>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="w-44"><Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Every status</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></div>
        {industry && <Button variant="ghost" onClick={() => setIndustry("")}>Every industry</Button>}
      </div>
      <Card>
        {list.isLoading ? <div className="p-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? <EmptyState title="No applications yet" /> : (
          <ul className="divide-y divide-stone-100">
            {rows.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => setOpen(a)} className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-stone-50">
                  <div className="min-w-0">
                    <p className="font-medium text-stone-900">{a.business_name} <span className="font-normal text-stone-500">· {a.industry_label}{a.staff_label ? ` · ${a.staff_label} people` : ""}</span></p>
                    <p className="text-sm text-stone-600">{a.contact_name} · {a.phone} · {a.email}{a.source ? ` · from ${a.source}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-500">{fmtDate(a.created_at)}<Badge tone={STATUS[a.status ?? "new"].tone}>{STATUS[a.status ?? "new"].label}</Badge></div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {open && <Review a={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); refresh(); }} />}
      {settings && prog.data && <Settings current={prog.data} onClose={() => setSettings(false)} onDone={() => { setSettings(false); void prog.refetch(); refresh(); }} />}
    </div>
  );
}

function Review({ a, onClose, onDone }: { a: Application; onClose: () => void; onDone: () => void }) {
  const [notes, setNotes] = useState(a.notes ?? "");
  const save = useMutation({
    mutationFn: async (status: string) => unwrap(await api.PATCH("/api/v1/platform/founding/{id}/", { params: { path: { id: a.id } }, body: { status, notes } as never })),
    onSuccess: (r) => { toast.success(r.status === "approved" ? "Approved: the code is on its way to them" : r.status === "declined" ? "Declined: they've been told" : "Saved"); onDone(); },
  });
  const decide = (status: string, question: string) => void ask(question, { confirmLabel: status === "approved" ? "Approve" : "Decline", danger: status === "declined" }).then((ok) => ok && save.mutate(status));
  return (
    <Modal open size="lg" title={a.business_name} onClose={onClose}>
      <div className="space-y-4 text-sm">
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {[["Contact", a.contact_name], ["Phone", a.phone], ["Email", a.email], ["Industry", a.industry_label], ["People", a.staff_label || "-"],
            ["Uses now", a.uses_now || "-"], ["Came from", a.source || "-"], ["Applied", fmtDate(a.created_at)]].map(([k, v]) => (
            <div key={k}><dt className="text-xs text-stone-500">{k}</dt><dd className="text-stone-900">{v}</dd></div>
          ))}
        </dl>
        {a.wants && <div><p className="text-xs text-stone-500">Wants help with</p><p className="whitespace-pre-line text-stone-800">{a.wants}</p></div>}
        {a.decided_by_name && <p className="text-xs text-stone-500">{STATUS[a.status ?? "new"].label} by {a.decided_by_name} on {fmtDate(a.decided_at)}</p>}
        <Field label="Notes (staff only)" hint="What you learned on the call."><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <FormError error={save.error} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" loading={save.isPending} onClick={() => save.mutate(a.status === "new" ? "contacted" : a.status ?? "new")}>{a.status === "new" ? "Save, mark contacted" : "Save notes"}</Button>
          {a.status !== "declined" && <Button variant="ghost" className="text-red-600" onClick={() => decide("declined", `Decline ${a.business_name}? They get an email inviting them to a free trial instead.`)}>Decline</Button>}
          {a.status !== "approved" && <Button onClick={() => decide("approved", `Approve ${a.business_name}? They're emailed the code and a sign-up link, and it takes a place.`)}>Approve</Button>}
        </div>
      </div>
    </Modal>
  );
}

function Settings({ current, onClose, onDone }: { current: components["schemas"]["Programme"]; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ is_open: current.is_open ?? true, places_per_industry: String(current.places_per_industry ?? 25), coupon_code: current.coupon_code ?? "", offer: current.offer ?? "" });
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PATCH("/api/v1/platform/founding/settings/", { body: { ...f, places_per_industry: Number(f.places_per_industry) } as never })),
    onSuccess: () => { toast.success("Saved"); onDone(); },
  });
  return (
    <Modal open title="Founding offer settings" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_open} onChange={(e) => setF((p) => ({ ...p, is_open: e.target.checked }))} /> Taking applications</label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Places per industry"><Input inputMode="numeric" value={f.places_per_industry} onChange={(e) => setF((p) => ({ ...p, places_per_industry: e.target.value }))} /></Field>
          <Field label="Code sent when approved" hint="Create it under Coupons."><Input value={f.coupon_code} onChange={(e) => setF((p) => ({ ...p, coupon_code: e.target.value.toUpperCase() }))} /></Field>
        </div>
        <Field label="The offer, in a few words" hint="Shown on the page and in the approval email."><Input value={f.offer} onChange={(e) => setF((p) => ({ ...p, offer: e.target.value }))} /></Field>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
      </form>
    </Modal>
  );
}
