"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Badge, Card, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { SUB_STATUS } from "@/lib/api/platform";
import { fmt, fmtDate } from "@/lib/format";

export default function AdminOverview() {
  const stats = useQuery({ queryKey: ["platform-stats"], queryFn: async () => unwrap(await api.GET("/api/v1/platform/stats/")) });
  const renewals = useQuery({ queryKey: ["platform-renewals"], queryFn: async () => unwrap(await api.GET("/api/v1/platform/renewals/", { params: { query: { days: 14 } as never } })) });
  if (stats.isLoading) return <Spinner />;
  if (stats.error) return <ErrorState error={stats.error} />;
  const s = stats.data!;
  const tile = (label: string, value: string | number, href?: string, tone = "") => {
    const body = <Card className="h-full p-4"><p className="text-xs uppercase text-stone-500">{label}</p><p className={`mt-1 font-mono text-2xl font-semibold ${tone}`}>{value}</p></Card>;
    return href ? <Link key={label} href={href} className="block hover:opacity-90">{body}</Link> : <div key={label}>{body}</div>;
  };
  return (
    <div className="w-full">
      <PageHeader title="MannaBooks admin" description="The whole platform at a glance." />
      <h2 className="mb-2 text-sm font-semibold text-stone-700">Money</h2>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tile("Monthly recurring revenue (KES)", fmt(s.mrr))}
        {tile("Collected this month (KES)", fmt(s.collected_this_month), "/admin/payments")}
        {tile("Payments to reconcile", s.payments_to_reconcile, "/admin/payments?reconcile=true", s.payments_to_reconcile ? "text-amber-700" : "")}
        {tile("Behind on payment", s.past_due, "/admin/businesses?status=past_due", s.past_due ? "text-amber-700" : "")}
      </div>
      <h2 className="mb-2 text-sm font-semibold text-stone-700">Businesses</h2>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tile("Businesses", s.businesses, "/admin/businesses")}
        {tile("New this month", s.new_this_month)}
        {tile("Paying", s.paying, "/admin/businesses?status=active")}
        {tile("On a trial", s.trialing, "/admin/businesses?status=trialing")}
        {tile("On the free plan", s.free, "/admin/businesses?plan=free")}
        {tile("Founding (complimentary)", s.complimentary)}
        {tile("Blocked", s.blocked, "/admin/businesses?status=blocked", s.blocked ? "text-red-700" : "")}
      </div>
      <h2 className="mb-2 text-sm font-semibold text-stone-700">Support</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tile("Open tickets", s.open_tickets, "/admin/tickets")}
        {tile("Urgent or high", s.urgent_tickets, "/admin/tickets?priority=urgent", s.urgent_tickets ? "text-red-700" : "")}
      </div>
      <h2 className="mb-2 mt-6 text-sm font-semibold text-stone-700">Upcoming renewals (14 days) and businesses behind</h2>
      <Card>
        {(renewals.data ?? []).length === 0 ? <p className="px-4 py-3 text-sm text-stone-500">Nothing due in the next two weeks.</p> : (
          <Table head={["Business", "Plan", "Status", "Date", "Reminders sent"]}>
            {renewals.data!.map((r) => (
              <tr key={r.slug}>
                <Td><Link href={`/admin/businesses/${r.slug}`} className="font-medium hover:underline">{r.business}</Link><div className="text-xs text-stone-500">{r.owner_email}</div></Td>
                <Td>{r.plan}</Td>
                <Td><Badge tone={SUB_STATUS[r.status]?.[1]}>{SUB_STATUS[r.status]?.[0]}</Badge></Td>
                <Td>{fmtDate(r.status === "trialing" ? r.trial_ends_on : r.paid_until)}</Td>
                <Td className="text-xs text-stone-500">{r.reminders_sent.length ? r.reminders_sent.slice(-2).map((k) => k.split(":")[0]).join(", ") : "None yet"}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <p className="mt-2 text-xs text-stone-500">Reminder emails go out by themselves: 7 days and 1 day before a trial ends or a plan renews, the day after a missed payment, and when a business turns read-only.</p>
    </div>
  );
}
