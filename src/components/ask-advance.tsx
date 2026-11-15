"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Field, FormError, Input, Modal, Select, Spinner, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

export function useAdvanceLimit(slug: string, query: Record<string, string | undefined>, enabled = true) {
  return useQuery({
    queryKey: ["advance-limit", slug, query], enabled, retry: false,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/advances/limit/", { params: { path: { workspace: slug }, query: query as never } })),
  });
}

/** For yourself: what you can ask for now, and how long it takes to pay back. */
export function AskAdvance({ onClose }: { onClose: () => void }) {
  const { slug } = useWorkspace();
  const [form, setForm] = useState({ requested_amount: "", months: "1", reason: "" });
  const limit = useAdvanceLimit(slug, { months: form.months });
  const l = limit.data;
  const waged = l?.basis === "earned";
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/advances/", { ...wsPath(slug), body: { ...form, months: Number(form.months) } as never })),
    onSuccess: (r) => { toast.success(`Asked for ${fmt(r.requested_amount)}`); onClose(); },
  });
  return (
    <Modal open title="Ask for a salary advance" onClose={onClose}>
      {limit.error ? <p className="text-sm text-stone-600">{limit.error.message}</p> : !l ? <Spinner /> : !l.enabled ? (
        <p className="text-sm text-stone-600">Salary advances are switched off for this business.</p>
      ) : (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
            {waged ? <>You can draw up to <b>{l.percent}%</b> of the pay you&apos;ve earned since you were last paid{l.last_paid_on ? ` (${fmtDate(l.last_paid_on)})` : ""}, at {fmt(l.rate)} a {l.pay_type === "daily" ? "day" : "hour"}. Your supervisor confirms the {l.pay_type === "daily" ? "days" : "hours"} worked, and it comes off your next pay.</>
              : <>You can ask for up to <b className="font-mono">{fmt(l.limit)}</b> this month ({l.percent}% of your net pay, less anything still owed). It comes off your next {Number(form.months) > 1 ? `${form.months} payslips` : "payslip"}.</>}
          </div>
          <Field label="How much do you need?"><Input inputMode="decimal" autoFocus required value={form.requested_amount} onChange={(e) => setForm((p) => ({ ...p, requested_amount: e.target.value }))} /></Field>
          {!waged && l.max_months > 1 && (
            <Field label="Pay it back over"><Select value={form.months} onChange={(e) => setForm((p) => ({ ...p, months: e.target.value }))}>
              {Array.from({ length: l.max_months }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 1 ? "1 month" : `${n} months`}</option>)}
            </Select></Field>
          )}
          <Field label="Reason (optional)"><Textarea rows={2} value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} /></Field>
          <FormError error={save.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Send</Button></div>
        </form>
      )}
    </Modal>
  );
}

