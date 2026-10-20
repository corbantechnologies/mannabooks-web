"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { PAYMENT_STATUS, SUB_STATUS, TICKET_STATUS } from "@/lib/api/platform";
import { fmt, fmtDate } from "@/lib/format";

type Action = "block" | "change_plan" | "extend_trial" | "set_discount" | "record_payment" | "note" | "set_complimentary";
type Payment = { id: string; paid_at: string | null; created_at: string; plan_name: string; cycle: string; amount: string; method: string; reference: string; status: string; recorded_by_name: string | null; note: string };
type TicketRow = { id: string; number: string; subject: string; status: string; updated_at: string };

export default function AdminBusinessPage() {
  const { slug } = useParams<{ slug: string }>();
  const detail = useQuery({ queryKey: ["platform-business", slug], queryFn: async () => unwrap(await api.GET("/api/v1/platform/businesses/{slug}/", { params: { path: { slug } } })) });
  const [dialog, setDialog] = useState<Action | null>(null);
  const act = useMutation({
    mutationFn: async (body: Record<string, unknown>) => unwrap(await api.POST("/api/v1/platform/businesses/{slug}/action/", { params: { path: { slug } }, body: body as never })),
    onSuccess: () => { toast.success("Done"); setDialog(null); },
    onError: (e) => toast.error(e.message),
  });
  const userAct = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "block" | "unblock" }) => unwrap(await api.POST("/api/v1/platform/users/{id}/action/", { params: { path: { id } }, body: { action } })),
    onSuccess: () => toast.success("Done"),
    onError: (e) => toast.error(e.message),
  });
  if (detail.isLoading) return <Spinner />;
  if (detail.error) return <ErrorState error={detail.error} />;
  const d = detail.data!;
  const b = d.business;
  const payments = d.payments as unknown as Payment[];
  const tickets = d.tickets as unknown as TicketRow[];
  return (
    <div className="w-full">
      <Link href="/admin/businesses" className="text-sm text-stone-500 hover:underline">&larr; Businesses</Link>
      <PageHeader title={b.name} description={`${b.owner_name} <${b.owner_email}> · account ${b.account_number} · joined ${fmtDate(b.created_at)}`}
        actions={<div className="flex flex-wrap gap-2">
          {b.blocked_at
            ? <Button onClick={() => act.mutate({ action: "unblock" })} loading={act.isPending}>Unblock</Button>
            : <Button variant="danger" onClick={() => setDialog("block")}>Block</Button>}
          <Button variant="secondary" onClick={() => setDialog("record_payment")}>Record payment</Button>
          <Button variant="secondary" onClick={() => setDialog("change_plan")}>Change plan</Button>
        </div>} />
      {b.blocked_at && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">Blocked {fmtDate(b.blocked_at)}: {b.blocked_reason}</div>}
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Card className="p-4"><p className="text-xs uppercase text-stone-500">Plan</p><p className="mt-1 font-semibold">{b.plan}</p><Badge tone={SUB_STATUS[b.status ?? "active"]?.[1]}>{SUB_STATUS[b.status ?? "active"]?.[0]}</Badge></Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-stone-500">{b.status === "trialing" ? "Trial ends" : "Paid up to"}</p>
          <p className="mt-1 font-semibold">{b.status === "trialing" ? fmtDate(b.trial_ends_on) : b.paid_until ? fmtDate(b.paid_until) : "-"}</p>
          <p className="text-xs text-stone-500">{b.complimentary ? `Free${b.complimentary_until ? ` until ${fmtDate(b.complimentary_until)}` : ""}${b.owner_full_access ? " (owner has full access)" : ""}` : ""}{Number(b.discount_percent) ? ` ${Number(b.discount_percent)}% off` : ""}</p>
        </Card>
        <Card className="p-4"><p className="text-xs uppercase text-stone-500">This month</p><p className="mt-1 text-sm">{d.usage.documents_this_month} documents · {d.usage.users} seats used</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-stone-500">Last active</p><p className="mt-1 text-sm">{d.usage.last_active ? fmtDate(d.usage.last_active) : "Never"}</p></Card>
      </div>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Button variant="ghost" onClick={() => setDialog("extend_trial")}>Extend trial</Button>
        <Button variant="ghost" onClick={() => setDialog("set_discount")}>Set discount</Button>
        {b.complimentary
          ? <Button variant="ghost" onClick={() => confirm("End the free access? The business gets a short trial, then normal billing.") && act.mutate({ action: "set_complimentary", complimentary: false })}>End free access</Button>
          : <Button variant="ghost" onClick={() => setDialog("set_complimentary")}>Give full access (free)</Button>}
        <Button variant="ghost" onClick={() => act.mutate({ action: "send_reminder" })}>Send payment reminder</Button>
        <Button variant="ghost" onClick={() => confirm("Move this business to the Free plan?") && act.mutate({ action: "move_to_free" })}>Move to Free</Button>
        <Button variant="ghost" onClick={() => setDialog("note")}>Notes</Button>
      </div>
      {b.notes && <Card className="mb-4 whitespace-pre-line p-4 text-sm text-stone-700">{b.notes}</Card>}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="px-4 pt-3 text-sm font-semibold">Team</h2>
          <Table head={["Name", "Role", "Last sign-in", ""]}>
            {d.members.map((m) => (
              <tr key={m.user_id}>
                <Td>{m.name}<div className="text-xs text-stone-500">{m.email}{m.phone ? ` · ${m.phone}` : ""}</div></Td>
                <Td>{m.role}</Td>
                <Td className="text-stone-500">{m.last_login ? fmtDate(m.last_login) : "-"}</Td>
                <Td>{m.user_active
                  ? <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => confirm(`Block ${m.name} from signing in anywhere?`) && userAct.mutate({ id: m.user_id, action: "block" })}>Block user</button>
                  : <button type="button" className="text-xs text-brand-700 hover:underline" onClick={() => userAct.mutate({ id: m.user_id, action: "unblock" })}>Unblock user</button>}</Td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card>
          <h2 className="px-4 pt-3 text-sm font-semibold">Payments</h2>
          {payments.length === 0 ? <p className="px-4 py-3 text-sm text-stone-500">None yet.</p> : (
            <Table head={["Date", "Plan", "Amount", "Reference", "Status"]}>
              {payments.map((p) => (
                <tr key={p.id}>
                  <Td>{fmtDate(p.paid_at ?? p.created_at)}</Td>
                  <Td>{p.plan_name} ({p.cycle})</Td>
                  <Td className="text-right font-mono">{fmt(p.amount)}</Td>
                  <Td className="font-mono text-xs">{p.reference || p.method}{p.recorded_by_name && <div className="font-sans text-stone-500">by {p.recorded_by_name}</div>}</Td>
                  <Td><Badge tone={PAYMENT_STATUS[p.status]?.[1]}>{PAYMENT_STATUS[p.status]?.[0]}</Badge>{p.note && <div className="text-xs text-stone-500">{p.note}</div>}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
        <Card>
          <h2 className="px-4 pt-3 text-sm font-semibold">Support tickets</h2>
          {tickets.length === 0 ? <p className="px-4 py-3 text-sm text-stone-500">None.</p> : (
            <ul className="divide-y divide-stone-100">
              {tickets.map((t) => <li key={t.id} className="flex justify-between px-4 py-2 text-sm"><Link href={`/admin/tickets/${t.id}`} className="hover:underline">{t.number}: {t.subject}</Link><Badge tone={TICKET_STATUS[t.status]?.[1]}>{TICKET_STATUS[t.status]?.[0]}</Badge></li>)}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="px-4 pt-3 text-sm font-semibold">What staff did</h2>
          {d.actions.length === 0 ? <p className="px-4 py-3 text-sm text-stone-500">Nothing yet.</p> : (
            <ul className="divide-y divide-stone-100 text-sm">
              {d.actions.map((a) => <li key={a.id} className="px-4 py-2"><span className="font-medium">{a.action.replace(/_/g, " ")}</span> <span className="text-stone-500">by {a.actor_name} · {fmtDate(a.created_at)}</span>{Object.keys(a.details as object).length > 0 && <div className="text-xs text-stone-500">{Object.entries(a.details as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join(" · ")}</div>}</li>)}
            </ul>
          )}
        </Card>
      </div>
      {dialog && <ActionDialog action={dialog} notes={b.notes ?? ""} plan={b.plan_key ?? "free"} pending={act.isPending} error={act.error} onClose={() => setDialog(null)} onSubmit={(body) => act.mutate({ action: dialog, ...body })} />}
    </div>
  );
}

const TITLES: Record<Action, string> = {
  block: "Block this business", set_complimentary: "Give this business full access, free", change_plan: "Change plan", extend_trial: "Extend the trial", set_discount: "Standing discount", record_payment: "Record a payment", note: "Staff notes",
};

function ActionDialog({ action, plan, notes, pending, error, onClose, onSubmit }: {
  action: Action; plan: string; notes: string; pending: boolean; error: unknown; onClose: () => void; onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [f, setF] = useState({ until: "", reason: "", plan: action === "set_complimentary" ? "kampuni" : plan, days: "14", discount_percent: "25", cycle: "monthly", periods: "1", amount: "", method: "bank", reference: "", note: "", notes });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const plans = <Select value={f.plan} onChange={set("plan")}>{["free", "biashara", "duka", "kampuni"].map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}</Select>;
  const body = (): Record<string, unknown> => ({
    block: { reason: f.reason }, change_plan: { plan: f.plan }, extend_trial: { days: Number(f.days) }, set_discount: { discount_percent: f.discount_percent },
    record_payment: { plan: f.plan, cycle: f.cycle, periods: Number(f.periods), amount: f.amount || "0", method: f.method, reference: f.reference, note: f.note },
    note: { notes: f.notes },
    set_complimentary: { complimentary: true, plan: f.plan, until: f.until || null, note: f.note },
  })[action];
  return (
    <Modal open title={TITLES[action]} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit(body()); }}>
        {action === "block" && <Field label="Why?" hint="The business's users see this."><Input required value={f.reason} onChange={set("reason")} placeholder="Fraud reported; contact support" /></Field>}
        {action === "change_plan" && <Field label="Plan" hint="Doesn't change what's paid; use Record payment for that.">{plans}</Field>}
        {action === "extend_trial" && <Field label="Days to add"><Input type="number" min={1} max={90} value={f.days} onChange={set("days")} /></Field>}
        {action === "set_discount" && <Field label="Discount on every payment (%)" hint="For example 25 for NGOs and churches, 50 for founding businesses."><Input inputMode="decimal" value={f.discount_percent} onChange={set("discount_percent")} /></Field>}
        {action === "record_payment" && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Plan">{plans}</Field>
              <Field label="Cycle"><Select value={f.cycle} onChange={set("cycle")}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></Select></Field>
              <Field label={f.cycle === "yearly" ? "Years" : "Months"}><Input type="number" min={1} value={f.periods} onChange={set("periods")} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Amount (KES)" hint="0 for a credit"><Input inputMode="decimal" value={f.amount} onChange={set("amount")} /></Field>
              <Field label="How"><Select value={f.method} onChange={set("method")}><option value="bank">Bank transfer</option><option value="mpesa">M-Pesa</option><option value="cash">Cash</option><option value="credit">Credit</option></Select></Field>
              <Field label="Reference"><Input value={f.reference} onChange={set("reference")} /></Field>
            </div>
            <Field label="Note"><Input value={f.note} onChange={set("note")} /></Field>
          </>
        )}
        {action === "set_complimentary" && (
          <>
            <p className="text-sm text-stone-600">Nothing to pay while it lasts. For a partner whose every business should be free, use Users &gt; Give full access instead.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Plan">{plans}</Field>
              <Field label="Free until (optional)" hint="Blank: until you end it. After this day, normal billing starts with a short trial."><Input type="date" value={f.until} onChange={set("until")} /></Field>
            </div>
            <Field label="Why?" hint="Kept in the staff notes."><Input required value={f.note} onChange={set("note")} placeholder="Church partner, pilot extension, competition prize" /></Field>
          </>
        )}
        {action === "note" && <Field label="Notes (staff only)"><Textarea rows={5} value={f.notes} onChange={set("notes")} /></Field>}
        <FormError error={error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" variant={action === "block" ? "danger" : "primary"} loading={pending}>Save</Button></div>
      </form>
    </Modal>
  );
}
