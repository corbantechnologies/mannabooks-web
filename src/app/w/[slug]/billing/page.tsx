"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Smartphone } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

const STATUS: Record<string, [string, "green" | "amber" | "red" | "blue" | "stone"]> = {
  trialing: ["Free trial", "blue"], active: ["Active", "green"], past_due: ["Payment due", "amber"], read_only: ["Read only", "red"], cancelled: ["Cancelled", "stone"],
};
const MODULE_LABEL: Record<string, string> = {
  sales: "Sales and invoicing", pos: "Point of sale", store: "Online shop", purchasing: "Purchasing", inventory: "Stock and warehouses",
  manufacturing: "Recipes and production", banking: "Cash and banking", people: "Payroll and leave", projects: "Projects", crm: "CRM",
  control: "Budgets, approvals and assets",
};

type Plan = { key: string; name: string; description: string; price_monthly: string; price_yearly: string; modules: unknown; features: unknown; max_users: number | null; max_documents_month: number | null; payroll_per_employee: string; is_free: boolean };

export default function BillingPage() {
  const { slug } = useWorkspace();
  const billing = useQuery({ queryKey: ["billing", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/billing/", { params: { path: { workspace: slug } } })) });
  const [paying, setPaying] = useState<Plan | null>(null);
  const toFree = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/billing/free/", { params: { path: { workspace: slug } } })),
    onSuccess: () => toast.success("Moved to the Free plan"),
    onError: (e) => toast.error(e.message),
  });
  if (billing.isLoading) return <Spinner />;
  if (billing.error) return <ErrorState error={billing.error} />;
  const b = billing.data!;
  const sub = b.subscription;
  const plans = b.plans as Plan[];
  const [label, tone] = STATUS[sub.status ?? "active"];
  return (
    <div className="w-full">
      <PageHeader title="Plan and billing" guide="plan-and-billing" description="Your MannaBooks plan, what you use, and paying for it by M-Pesa." />
      <Card className="mb-6 grid gap-4 p-5 sm:grid-cols-4">
        <div><p className="text-xs uppercase text-stone-500">Plan</p><p className="mt-1 text-lg font-semibold">{sub.plan.name}</p><Badge tone={tone}>{label}</Badge></div>
        <div>
          <p className="text-xs uppercase text-stone-500">{sub.complimentary ? "Billing" : sub.status === "trialing" ? "Trial ends" : "Paid up to"}</p>
          <p className="mt-1 font-medium">{sub.complimentary ? "Free for founding businesses" : sub.status === "trialing" ? fmtDate(sub.trial_ends_on) : sub.paid_until ? fmtDate(sub.paid_until) : sub.plan.is_free ? "Nothing to pay" : "Not paid yet"}</p>
          {Number(sub.discount_percent) > 0 && <p className="text-xs text-brand-700">{Number(sub.discount_percent)}% discount</p>}
        </div>
        <div>
          <p className="text-xs uppercase text-stone-500">This month</p>
          <p className="mt-1 text-sm">{b.usage.documents_this_month}{sub.plan.max_documents_month ? ` of ${sub.plan.max_documents_month}` : ""} documents</p>
          <p className="text-sm">{b.usage.users}{sub.plan.max_users ? ` of ${sub.plan.max_users}` : ""} team members</p>
        </div>
        <div>
          <p className="text-xs uppercase text-stone-500">Pay by M-Pesa</p>
          <p className="mt-1 text-sm">{b.paybill ? <>Paybill <span className="font-mono font-semibold">{b.paybill}</span></> : "Paybill coming soon"}</p>
          <p className="text-sm">Account <span className="font-mono font-semibold">{sub.account_number}</span></p>
        </div>
      </Card>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => {
          const current = p.key === sub.plan.key;
          const modules = (p.modules as string[]) ?? [];
          return (
            <Card key={p.key} className={`flex flex-col p-5 ${current ? "ring-2 ring-brand-600" : ""}`}>
              <p className="flex items-center justify-between font-semibold text-stone-900">{p.name} {current && <Badge tone="green">Your plan</Badge>}</p>
              <p className="mt-1 text-sm text-stone-600">{p.description}</p>
              <p className="mt-3"><span className="text-2xl font-bold">{p.is_free ? "Free" : `KES ${fmt(p.price_monthly).replace(".00", "")}`}</span>{!p.is_free && <span className="text-sm text-stone-500"> a month</span>}</p>
              {!p.is_free && <p className="text-xs text-stone-500">or KES {fmt(p.price_yearly).replace(".00", "")} a year</p>}
              <ul className="mt-3 flex-1 space-y-1 text-sm text-stone-700">
                <li className="flex flex-wrap gap-2"><Check className="mt-0.5 h-4 w-4 text-brand-600" />{p.max_users ? `${p.max_users} team member${p.max_users === 1 ? "" : "s"}` : "Unlimited team"}, plus free accountant seats</li>
                <li className="flex flex-wrap gap-2"><Check className="mt-0.5 h-4 w-4 text-brand-600" />{p.max_documents_month ? `${p.max_documents_month} documents a month` : "Unlimited documents"}</li>
                {modules.map((m) => <li key={m} className="flex flex-wrap gap-2"><Check className="mt-0.5 h-4 w-4 text-brand-600" />{MODULE_LABEL[m] ?? m}{m === "people" && Number(p.payroll_per_employee) ? ` (+KES ${Number(p.payroll_per_employee)} per employee)` : ""}</li>)}
                {((p.features as string[]) ?? []).includes("company_groups") && <li className="flex flex-wrap gap-2"><Check className="mt-0.5 h-4 w-4 text-brand-600" />Company groups</li>}
              </ul>
              <div className="mt-4">
                {p.is_free ? (
                  !current && !sub.complimentary && <Button variant="secondary" className="w-full" loading={toFree.isPending} onClick={() => confirm("Move to the Free plan now? Parts outside it become read-only.") && toFree.mutate()}>Move to Free</Button>
                ) : (
                  !sub.complimentary && <Button className="w-full" variant={current ? "secondary" : "primary"} onClick={() => setPaying(p)}>{current ? "Pay or renew" : "Choose"}</Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <h2 className="px-4 pt-3 text-sm font-semibold">Payments</h2>
        {b.payments.length === 0 ? <p className="px-4 py-3 text-sm text-stone-500">No payments yet.</p> : (
          <Table head={["Date", "Plan", "Period", "Amount", "Reference", "Status"]}>
            {b.payments.map((p) => (
              <tr key={p.id}>
                <Td>{fmtDate(p.paid_at ?? p.created_at)}</Td>
                <Td>{p.plan_name} ({p.cycle})</Td>
                <Td className="text-stone-600">{p.covers_from ? `${fmtDate(p.covers_from)} to ${fmtDate(p.covers_to)}` : "-"}</Td>
                <Td className="text-right font-mono">{fmt(p.amount)}{Number(p.discount) > 0 && <div className="text-xs text-brand-700">-{fmt(p.discount)}</div>}</Td>
                <Td className="font-mono text-xs">{p.reference || "-"}</Td>
                <Td><Badge tone={p.status === "completed" ? "green" : p.status === "pending" ? "amber" : "stone"}>{p.status === "pending" ? "Waiting" : p.status}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {paying && <PayDialog plan={paying} onClose={() => setPaying(null)} />}
    </div>
  );
}

function PayDialog({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const { slug } = useWorkspace();
  const [form, setForm] = useState({ cycle: "monthly", periods: 1, coupon: "", phone: "" });
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const path = { params: { path: { workspace: slug } } };
  const quote = useQuery({
    queryKey: ["billing-quote", slug, plan.key, form.cycle, form.periods, form.coupon], retry: false,
    queryFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/billing/quote/", { ...path, body: { plan: plan.key, cycle: form.cycle as never, periods: form.periods, coupon: form.coupon } })),
  });
  const pay = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/billing/pay/", { ...path, body: { plan: plan.key, cycle: form.cycle as never, periods: form.periods, coupon: form.coupon, phone: form.phone } })),
    onSuccess: (p) => setPaymentId(p.id),
  });
  const status = useQuery({
    queryKey: ["billing-payment", slug, paymentId], enabled: Boolean(paymentId),
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 4000 : false),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/billing/payments/{id}/", { params: { path: { workspace: slug, id: paymentId! } } })),
  });
  const q = quote.data;
  const done = status.data?.status === "completed";
  return (
    <Modal open title={`Pay for ${plan.name}`} onClose={onClose}>
      {done ? (
        <div className="space-y-3 py-2 text-sm">
          <p className="flex items-center gap-2 text-brand-700"><Check className="h-5 w-5" /> Paid. Thank you: the {plan.name} plan runs to {fmtDate(status.data!.covers_to)}.</p>
          <div className="flex justify-end"><Button onClick={onClose}>Done</Button></div>
        </div>
      ) : paymentId ? (
        <div className="space-y-3 py-2 text-sm">
          <p className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-brand-600" /> {status.data?.status === "failed" ? "The payment didn't go through. Try again." : "Check your phone and enter your M-Pesa PIN."}</p>
          {status.data?.status === "failed" && <div className="flex justify-end"><Button onClick={() => setPaymentId(null)}>Try again</Button></div>}
        </div>
      ) : (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); pay.mutate(); }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Pay"><Select value={form.cycle} onChange={(e) => setForm((f) => ({ ...f, cycle: e.target.value, periods: 1 }))}><option value="monthly">Monthly</option><option value="yearly">Yearly (2 months free)</option></Select></Field>
            <Field label={form.cycle === "yearly" ? "Years" : "Months"}><Input type="number" min={1} max={form.cycle === "yearly" ? 3 : 24} value={form.periods} onChange={(e) => setForm((f) => ({ ...f, periods: Math.max(1, Number(e.target.value) || 1) }))} /></Field>
          </div>
          <Field label="Discount code (optional)"><Input value={form.coupon} onChange={(e) => setForm((f) => ({ ...f, coupon: e.target.value.toUpperCase() }))} /></Field>
          {quote.error ? <FormError error={quote.error} /> : q && (
            <dl className="grid grid-cols-[1fr_auto] gap-y-1 rounded-md bg-stone-50 p-3 text-sm">
              <dt className="text-stone-500">{plan.name}, {form.periods} {form.cycle === "yearly" ? "year" : "month"}{form.periods > 1 ? "s" : ""}</dt><dd className="text-right font-mono">{fmt(q.list_price)}</dd>
              {Number(q.payroll_addon) > 0 && <><dt className="text-xs text-stone-500">includes payroll add-on</dt><dd className="text-right font-mono text-xs">{fmt(q.payroll_addon)}</dd></>}
              {Number(q.discount) > 0 && <><dt className="text-brand-700">Discount{q.coupon ? ` (${q.coupon})` : ""}</dt><dd className="text-right font-mono text-brand-700">-{fmt(q.discount)}</dd></>}
              <dt className="font-semibold">To pay (KES, VAT included)</dt><dd className="text-right font-mono font-semibold">{fmt(q.amount)}</dd>
            </dl>
          )}
          <Field label="M-Pesa phone"><Input required value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0712 345 678" /></Field>
          <FormError error={pay.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={pay.isPending} disabled={!q}><Smartphone className="h-4 w-4" /> Send M-Pesa prompt</Button></div>
        </form>
      )}
    </Modal>
  );
}
