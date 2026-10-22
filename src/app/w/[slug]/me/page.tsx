"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, Field, FormError, Input, Modal, Select, Spinner, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { LEAVE_STATUS, LEAVE_TYPES } from "@/lib/api/people";
import { fmt, fmtDate, todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

/** Employee self-service: my leave and my payslips. Built for phones first. */
export default function MePage() {
  const { slug } = useWorkspace();
  const [asking, setAsking] = useState(false);
  const balance = useQuery({ queryKey: ["leave-balances", slug, "mine"], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/leave-requests/balances/", wsPath(slug))), retry: false });
  const requests = useQuery({ queryKey: ["leave-requests", slug, "mine"], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/leave-requests/", { params: { path: { workspace: slug }, query: { mine: "true", page_size: 20 } as never } })) });
  const slips = useQuery({ queryKey: ["payslips", slug, "mine"], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/payslips/", { params: { path: { workspace: slug }, query: { mine: "true", page_size: 24 } as never } })) });
  const cancel = useMutation({
    mutationFn: async (id: string) => unwrap(await api.POST("/api/v1/w/{workspace}/leave-requests/{id}/action/", { params: { path: { workspace: slug, id } }, body: { action: "cancel" } })),
    onSuccess: () => toast.success("Request cancelled"), onError: (e) => toast.error(e.message),
  });
  if (balance.error) {
    return <Card className="mx-auto max-w-md p-6 text-center text-sm text-stone-600">Your sign-in isn&apos;t linked to an employee record yet. Ask HR to link it, then your leave and payslips appear here.</Card>;
  }
  const b = balance.data?.[0];
  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="text-xl font-semibold">My leave and pay</h1>
      <Card className="p-4">
        {balance.isLoading ? <Spinner /> : b && (
          <div className="flex items-end justify-between">
            <div><p className="text-sm text-stone-500">Annual leave left in {b.year}</p><p className="text-3xl font-semibold">{Number(b.remaining)} <span className="text-base font-normal text-stone-500">days</span></p>
              <p className="text-xs text-stone-500">{Number(b.taken)} taken · {Number(b.pending)} waiting · {Number(b.entitlement)} a year</p></div>
            <Button onClick={() => setAsking(true)}>Ask for leave</Button>
          </div>
        )}
      </Card>
      <section>
        <h2 className="mb-2 text-sm font-semibold">My requests</h2>
        <div className="space-y-2">
          {(requests.data?.results ?? []).length === 0 && <p className="text-sm text-stone-500">No leave requests yet.</p>}
          {(requests.data?.results ?? []).map((r) => (
            <Card key={r.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-medium">{r.leave_type_label} · {Number(r.days)} days</p>
                <p className="text-xs text-stone-500">{fmtDate(r.start_date)} – {fmtDate(r.end_date)}{r.decision_note ? ` · "${r.decision_note}"` : ""}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge tone={LEAVE_STATUS[r.status ?? "pending"].tone}>{LEAVE_STATUS[r.status ?? "pending"].label}</Badge>
                {(r.status === "pending" || (r.status === "approved" && r.start_date > todayIso())) && <button className="text-xs text-stone-500 underline" onClick={() => confirm("Cancel this request?") && cancel.mutate(r.id)}>Cancel</button>}
              </div>
            </Card>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold">My payslips</h2>
        <div className="space-y-2">
          {(slips.data?.results ?? []).length === 0 && <p className="text-sm text-stone-500">No payslips yet.</p>}
          {(slips.data?.results ?? []).map((s) => (
            <Link key={s.id} href={`/w/${slug}/payroll/payslips/${s.id}`}>
              <Card className="mb-2 flex items-center justify-between p-3 hover:border-brand-600">
                <div><p className="font-medium">{s.period}</p><p className="text-xs text-stone-500">Paid {fmtDate(s.pay_date)}</p></div>
                <div className="flex items-center gap-2"><span className="font-mono font-semibold">{fmt(s.net_pay)}</span><ChevronRight className="h-4 w-4 text-stone-400" /></div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
      {asking && <AskLeave onClose={() => setAsking(false)} />}
    </div>
  );
}

function AskLeave({ onClose }: { onClose: () => void }) {
  const { slug } = useWorkspace();
  const [form, setForm] = useState({ leave_type: "annual", start_date: todayIso(), end_date: todayIso(), reason: "" });
  const ask = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/leave-requests/", { ...wsPath(slug), body: form as never })),
    onSuccess: (r) => { toast.success(`Asked for ${Number(r.days)} days`); onClose(); },
  });
  return (
    <Modal open title="Ask for leave" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); ask.mutate(); }}>
        <Field label="Type"><Select value={form.leave_type} onChange={(e) => setForm((p) => ({ ...p, leave_type: e.target.value }))}>{LEAVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First day"><Input type="date" required value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} /></Field>
          <Field label="Last day"><Input type="date" required value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} /></Field>
        </div>
        <Field label="Reason (optional)"><Textarea rows={2} value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} /></Field>
        <p className="text-xs text-stone-500">Weekends are not counted. Your supervisor is asked to approve it.</p>
        <FormError error={ask.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={ask.isPending}>Send</Button></div>
      </form>
    </Modal>
  );
}
