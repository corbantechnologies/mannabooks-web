"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { AskAdvance, useAdvanceLimit as useLimit } from "@/components/ask-advance";
import { ask } from "@/components/confirm";
import { Badge, Button, Card, EmptyState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { useBankAccounts } from "@/lib/api/banking";
import { api, unwrap } from "@/lib/api/client";
import { ADVANCE_STATUS } from "@/lib/api/people";
import type { components } from "@/lib/api/schema";
import { fmt, fmtDate, todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

type Advance = components["schemas"]["SalaryAdvance"];
const OPEN = "pending,recommended,approved,paid";

/** Salary advances: ask for one, recommend (supervisor or department head), approve and pay (finance), and see what's still to recover. */
export default function AdvancesPage() {
  const { slug, can } = useWorkspace();
  const finance = can("advances.approve");
  const [status, setStatus] = useState(OPEN);
  const [asking, setAsking] = useState(false);
  const [deciding, setDeciding] = useState<Advance | null>(null);
  const [paying, setPaying] = useState<Advance | null>(null);
  const [rules, setRules] = useState(false);
  const list = useQuery({
    queryKey: ["advances", slug, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/advances/", {
      params: { path: { workspace: slug }, query: { ...(status.includes(",") ? { status__in: status } : status ? { status } : {}), page_size: 200 } as never },
    })),
  });
  const act = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      unwrap(await api.POST("/api/v1/w/{workspace}/advances/{id}/action/", { params: { path: { workspace: slug, id } }, body: body as never })),
    onSuccess: (r) => toast.success(`${r.employee_name}: ${ADVANCE_STATUS[r.status ?? "pending"].label.toLowerCase()}`),
    onError: (e) => toast.error(e.message),
  });
  const rows = list.data?.results ?? [];
  return (
    <div className="space-y-6">
      <PageHeader title="Salary advances" guide="salary-advances"
        description="Pay staff have earned, or will earn this month, paid early and taken back on their next payslips. Their supervisor recommends it; finance approves and pays."
        actions={<div className="flex gap-2">
          {finance && <Button variant="secondary" onClick={() => setRules(true)}>Rules</Button>}
          <Button onClick={() => setAsking(true)}>Ask for an advance</Button>
        </div>} />
      <div className="w-60">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value={OPEN}>Open</option><option value="pending">Waiting for a supervisor</option><option value="recommended">Waiting for finance</option>
          <option value="approved">Approved, not paid</option><option value="paid">Being taken back</option><option value="recovered">Paid back</option>
          <option value="declined">Declined</option><option value="">All</option>
        </Select>
      </div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : rows.length === 0 ? <EmptyState title="No advances here" /> : (
          <Table head={["Employee", "Asked", "Approved", "Over", "Still to recover", "Reason", "Status", ""]}>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td className="font-medium">{r.employee_name}<p className="text-xs font-normal text-stone-500">{fmtDate(r.created_at)}{r.department ? ` · ${r.department}` : ""}</p></Td>
                <Td className="text-right font-mono">{fmt(r.requested_amount)}</Td>
                <Td className="text-right font-mono">{["pending", "recommended", "declined", "cancelled"].includes(r.status ?? "") ? "" : fmt(r.amount)}</Td>
                <Td>{r.months === 1 ? "1 payslip" : `${r.months} payslips`}</Td>
                <Td className="text-right font-mono">{r.status === "paid" ? fmt(r.outstanding) : ""}</Td>
                <Td className="max-w-xs text-stone-600">{r.reason}{r.decision_note ? <p className="text-xs text-stone-500">&ldquo;{r.decision_note}&rdquo;</p> : null}</Td>
                <Td><Badge tone={ADVANCE_STATUS[r.status ?? "pending"].tone}>{ADVANCE_STATUS[r.status ?? "pending"].label}</Badge></Td>
                <Td className="whitespace-nowrap">
                  {r.can_recommend && <Button variant="ghost" className="px-2 py-1 text-green-700" onClick={() => act.mutate({ id: r.id, body: { action: "recommend" } })}>Recommend</Button>}
                  {r.can_approve && <Button variant="ghost" className="px-2 py-1 text-green-700" onClick={() => setDeciding(r)}>Approve</Button>}
                  {r.can_pay && <Button variant="ghost" className="px-2 py-1 text-green-700" onClick={() => setPaying(r)}>Record payment</Button>}
                  {(r.can_recommend || r.can_approve || r.can_pay) && <Button variant="ghost" className="px-2 py-1 text-red-600" onClick={() => {
                    const note = window.prompt("Why not? They'll see this.");
                    if (note?.trim()) act.mutate({ id: r.id, body: { action: "decline", note } });
                  }}>Decline</Button>}
                  {r.can_cancel && !r.can_approve && !r.can_pay && <Button variant="ghost" className="px-2 py-1 text-stone-500" onClick={() => void ask("Cancel this advance request?").then((ok) => ok && act.mutate({ id: r.id, body: { action: "cancel" } }))}>Cancel</Button>}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {asking && <AskAdvance onClose={() => setAsking(false)} />}
      {deciding && <ApproveAdvance adv={deciding} onClose={() => setDeciding(null)} />}
      {paying && <PayAdvance adv={paying} onClose={() => setPaying(null)} />}
      {rules && <AdvanceRules onClose={() => setRules(false)} />}
    </div>
  );
}

function ApproveAdvance({ adv, onClose }: { adv: Advance; onClose: () => void }) {
  const { slug } = useWorkspace();
  const waged = adv.pay_type === "daily" || adv.pay_type === "hourly";
  const [form, setForm] = useState({ amount: String(Number(adv.requested_amount)), months: String(adv.months ?? 1), days_worked: "", note: "" });
  const limit = useLimit(slug, { employee: adv.employee_id ?? undefined, ...(waged ? { days: form.days_worked || undefined } : { months: form.months }) });
  const l = limit.data;
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/advances/{id}/action/", {
      params: { path: { workspace: slug, id: adv.id } },
      body: { action: "approve", amount: form.amount, note: form.note, ...(waged ? { days_worked: form.days_worked } : { months: Number(form.months) }) } as never,
    })),
    onSuccess: () => { toast.success("Approved. Record the payment when it's sent."); onClose(); },
  });
  const unit = adv.pay_type === "hourly" ? "Hours" : "Days";
  return (
    <Modal open title={`Approve ${adv.employee_name}'s advance`} onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <p className="text-sm text-stone-600">Asked for <b className="font-mono">{fmt(adv.requested_amount)}</b>{adv.reason ? `: ${adv.reason}` : ""}.{adv.recommended_by_name ? ` Recommended by ${adv.recommended_by_name}.` : ""}</p>
        {waged && (
          <Field label={`${unit} worked since they were last paid${l?.last_paid_on ? ` (${fmtDate(l.last_paid_on)})` : ""}`}>
            <Input inputMode="decimal" autoFocus required value={form.days_worked} onChange={(e) => setForm((p) => ({ ...p, days_worked: e.target.value }))} />
          </Field>
        )}
        {l && (waged ? form.days_worked : true) && (
          <div className="rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
            {waged ? <>Earned: <span className="font-mono">{fmt(l.earned)}</span> ({Number(l.units)} × {fmt(l.rate)}). </> : <>Usual net pay: <span className="font-mono">{fmt(l.net_pay)}</span>. </>}
            {Number(l.owed) > 0 && <>Still owed on other advances: <span className="font-mono">{fmt(l.owed)}</span>. </>}
            The most they can have: <b className="font-mono">{fmt(l.limit)}</b>.
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Amount to approve"><Input inputMode="decimal" required value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} /></Field>
          {!waged && l && l.max_months > 1 && (
            <Field label="Take it back over"><Select value={form.months} onChange={(e) => setForm((p) => ({ ...p, months: e.target.value }))}>
              {Array.from({ length: l.max_months }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 1 ? "1 payslip" : `${n} payslips`}</option>)}
            </Select></Field>
          )}
        </div>
        {waged && <p className="text-xs text-stone-500">Waged staff only draw pay already earned. It all comes off their next pay.</p>}
        <Field label="Note (optional)"><Input value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} /></Field>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Approve</Button></div>
      </form>
    </Modal>
  );
}

function PayAdvance({ adv, onClose }: { adv: Advance; onClose: () => void }) {
  const { slug } = useWorkspace();
  const accounts = useBankAccounts(slug);
  const active = (accounts.data?.results ?? []).filter((a) => a.is_active);
  const [form, setForm] = useState({ bank_account_id: "", date: todayIso(), reference: "" });
  const account = form.bank_account_id || active.find((a) => a.kind === "mobile")?.id || active[0]?.id || "";
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/advances/{id}/action/", {
      params: { path: { workspace: slug, id: adv.id } }, body: { action: "pay", ...form, bank_account_id: account } as never,
    })),
    onSuccess: () => { toast.success("Payment recorded. It comes off their next payslip."); onClose(); },
  });
  return (
    <Modal open title={`Pay ${fmt(adv.amount)} to ${adv.employee_name}`} onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <p className="text-sm text-stone-600">Send the money first (bank, M-Pesa or cash), then record it here. It goes to Staff advances, money they owe the business, not an expense.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Paid from"><Select value={account} onChange={(e) => setForm((p) => ({ ...p, bank_account_id: e.target.value }))}>{active.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
          <Field label="Date"><Input type="date" required value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} /></Field>
        </div>
        <Field label="Reference (optional)"><Input placeholder="e.g. M-Pesa code" value={form.reference} onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))} /></Field>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Record payment</Button></div>
      </form>
    </Modal>
  );
}

function AdvanceRules({ onClose }: { onClose: () => void }) {
  const { slug } = useWorkspace();
  const current = useQuery({ queryKey: ["advance-policy", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/advances/policy/", wsPath(slug))) });
  const [form, setForm] = useState<{ enabled: boolean; limit_percent: string; max_months: string } | null>(null);
  const f = form ?? (current.data ? { enabled: current.data.enabled ?? true, limit_percent: String(current.data.limit_percent ?? 50), max_months: String(current.data.max_months ?? 3) } : null);
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PUT("/api/v1/w/{workspace}/advances/policy/", { ...wsPath(slug), body: { enabled: f!.enabled, limit_percent: Number(f!.limit_percent), max_months: Number(f!.max_months) } as never })),
    onSuccess: () => { toast.success("Rules saved"); onClose(); },
  });
  return (
    <Modal open title="Salary advance rules" onClose={onClose}>
      {!f ? <Spinner /> : (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.enabled} onChange={(e) => setForm({ ...f, enabled: e.target.checked })} /> Staff can ask for salary advances</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Most they can have (%)"><Input inputMode="numeric" value={f.limit_percent} onChange={(e) => setForm({ ...f, limit_percent: e.target.value })} /></Field>
            <Field label="Longest to pay back (months)"><Input inputMode="numeric" value={f.max_months} onChange={(e) => setForm({ ...f, max_months: e.target.value })} /></Field>
          </div>
          <p className="text-xs text-stone-500">Salaried staff: a share of the month&apos;s net pay. Waged staff: a share of what they&apos;ve earned since they were last paid, all taken back from their next pay. Whatever the rules, a payslip never takes so much back that they&apos;re left with less than a third of their pay.</p>
          <FormError error={save.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
        </form>
      )}
    </Modal>
  );
}
