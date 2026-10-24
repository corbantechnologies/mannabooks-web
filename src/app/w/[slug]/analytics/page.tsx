"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Badge, Card, ErrorState, PageHeader, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

type Doc = components["schemas"]["GlanceDoc"];

const PATH: Record<string, string> = { invoices: "sales/invoices", bills: "purchasing/bills", quotations: "sales/quotations" };

/** The business at a glance: what needs attention today. Each part shows only to people allowed to see it. */
export default function AnalyticsPage() {
  const { slug, context } = useWorkspace();
  const cur = context.workspace.currency;
  const glance = useQuery({
    queryKey: ["glance", slug],
    refetchInterval: 5 * 60000,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/reports/glance/", { params: { path: { workspace: slug } } })),
  });
  if (glance.isLoading) return <Spinner label="Adding up the numbers" />;
  if (glance.error) return <ErrorState error={glance.error} />;
  const { sales, quotes, receivables: ar, payables: ap, cash } = glance.data!;
  const nothing = !sales && !quotes && !ar && !ap && !cash;
  const link = (href: string) => `/w/${slug}/${href}`;

  return (
    <div className="w-full">
      <PageHeader title="Analytics" description={`What needs attention today, ${fmtDate(glance.data!.today)}. Amounts in ${cur}.${context.limited_department ? ` Limited to ${context.limited_department.name}.` : ""}`} />
      {nothing && <Card className="p-5 text-sm text-stone-600">There is nothing here for your role yet. Your Overview shows what you can work on.</Card>}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {sales && (
          <Tile label={`Sales in ${sales.month_label}`} value={fmt(sales.this_month)} href={link("sales/invoices")}
            note={sales.change_percent === null ? `${sales.last_month_label}: ${fmt(sales.last_month)}` : undefined}
            trend={sales.change_percent === null ? undefined : { pct: sales.change_percent, against: `${sales.last_month_label} by this day` }} />
        )}
        {sales?.collected != null && <Tile label="Money in this month" value={fmt(sales.collected)} note="Payments received and cash sales" href={link("sales/payments")} />}
        {ar && <Tile label="Customers owe you" value={fmt(ar.total)} note={Number(ar.overdue) ? `${fmt(ar.overdue)} overdue` : "Nothing overdue"} bad={Number(ar.overdue) > 0} href={link("accounting/reports/aged-receivables")} />}
        {ap && <Tile label="You owe suppliers" value={fmt(ap.total)} note={Number(ap.overdue) ? `${fmt(ap.overdue)} overdue` : "Nothing overdue"} bad={Number(ap.overdue) > 0} href={link("accounting/reports/aged-payables")} />}
        {cash && <Tile label="Cash and bank" value={fmt(cash.total)} note={`${cash.accounts.length} account${cash.accounts.length === 1 ? "" : "s"}`} bad={Number(cash.total) < 0} href={link("banking")} />}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {ar && (
          <Section title="Money coming in" href={link("sales/invoices")}>
            <Facts items={[
              [`Overdue (${ar.overdue_count})`, fmt(ar.overdue), Number(ar.overdue) > 0],
              [`Due in the next 7 days (${ar.due_soon_count})`, fmt(ar.due_soon)],
              [`Unpaid invoices`, `${ar.count}`],
              [`Draft invoices not issued`, `${ar.draft_count}`, false, link("sales/invoices")],
            ]} />
            <Docs docs={ar.list} slug={slug} empty="No invoices overdue or due this week." />
            {ar.top_overdue.length > 0 && (
              <div className="border-t border-stone-100 px-4 py-3">
                <p className="mb-1 text-xs uppercase tracking-wide text-stone-500">Most overdue</p>
                {ar.top_overdue.map((d) => (
                  <p key={d.name} className="flex justify-between text-sm"><span className="truncate">{d.name} <span className="text-xs text-stone-500">({d.count})</span></span><span className="font-mono text-red-700">{fmt(d.amount)}</span></p>
                ))}
              </div>
            )}
          </Section>
        )}

        {ap && (
          <Section title="Money going out" href={link("purchasing/bills")}>
            <Facts items={[
              [`Overdue bills (${ap.overdue_count})`, fmt(ap.overdue), Number(ap.overdue) > 0],
              [`Due in the next 7 days (${ap.due_soon_count})`, fmt(ap.due_soon)],
              [`Unpaid bills`, `${ap.count}`],
              [`Draft bills not posted`, `${ap.draft_count}`, false, link("purchasing/bills")],
              ...(ap.vouchers_waiting != null ? [[`Payment vouchers awaiting approval (${ap.vouchers_waiting})`, fmt(ap.vouchers_waiting_value ?? "0"), false, link("purchasing/vouchers")] as Fact] : []),
            ]} />
            <Docs docs={ap.list} slug={slug} empty="No bills overdue or due this week." />
          </Section>
        )}

        {quotes && (
          <Section title="Quotations" href={link("sales/quotations")}>
            <Facts items={[
              [`Open (${quotes.open_count}: ${quotes.sent_count} sent, ${quotes.draft_count} draft)`, fmt(quotes.open_value)],
              [`Expiring in the next 7 days (${quotes.expiring_count})`, fmt(quotes.expiring_value), quotes.expiring_count > 0],
              [`Accepted, not yet invoiced (${quotes.accepted_count})`, fmt(quotes.accepted_value)],
              ...(quotes.to_review_count ? [[`From catalogues, waiting for your review`, `${quotes.to_review_count}`, true, link("sales/quotations")] as Fact] : []),
            ]} />
            <Docs docs={quotes.list} slug={slug} empty="No accepted quotations waiting to be invoiced." accepted />
          </Section>
        )}

        {cash && (
          <Section title="Cash and bank" href={link("banking")}>
            {cash.accounts.length === 0 ? <p className="px-4 py-6 text-sm text-stone-500">No cash or bank accounts used yet.</p> : (
              <ul className="divide-y divide-stone-100">
                {cash.accounts.map((a) => (
                  <li key={a.name} className="flex justify-between px-4 py-2 text-sm"><span>{a.name}</span><span className={clsx("font-mono", Number(a.balance) < 0 && "text-red-700")}>{fmt(a.balance)}</span></li>
                ))}
              </ul>
            )}
          </Section>
        )}
      </div>
      {sales && <p className="mt-4 text-xs text-stone-500">Sales are before VAT: invoices, debit notes and cash sales. The change compares {sales.month_label} so far with the same days of {sales.last_month_label}.</p>}
    </div>
  );
}

function Tile({ label, value, note, href, bad, trend }: { label: string; value: string; note?: string; href: string; bad?: boolean; trend?: { pct: number; against: string } }) {
  const up = (trend?.pct ?? 0) >= 0;
  return (
    <Link href={href}>
      <Card className="h-full p-4 transition-colors hover:border-brand-300">
        <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
        <p className={clsx("mt-1 font-mono text-xl font-semibold", bad ? "text-red-700" : "text-stone-900")}>{value}</p>
        {trend && (
          <p className={clsx("mt-0.5 flex items-center gap-1 text-xs", up ? "text-green-700" : "text-red-700")}>
            {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{Math.abs(trend.pct)}% <span className="text-stone-500">vs {trend.against}</span>
          </p>
        )}
        {note && <p className={clsx("mt-0.5 text-xs", bad ? "text-red-700" : "text-stone-500")}>{note}</p>}
      </Card>
    </Link>
  );
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
        <Link href={href} className="text-xs text-brand-700 hover:underline">Open &rarr;</Link>
      </div>
      {children}
    </Card>
  );
}

type Fact = [string, string, boolean?, string?];

function Facts({ items }: { items: Fact[] }) {
  return (
    <dl className="divide-y divide-stone-100 text-sm">
      {items.map(([label, value, alert, href]) => (
        <div key={label} className="flex items-center justify-between gap-3 px-4 py-2">
          <dt className="text-stone-600">{href ? <Link href={href} className="hover:underline">{label}</Link> : label}</dt>
          <dd className={clsx("font-mono", alert ? "font-semibold text-red-700" : "text-stone-900")}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Docs({ docs, slug, empty, accepted }: { docs: Doc[]; slug: string; empty: string; accepted?: boolean }) {
  if (!docs.length) return <p className="border-t border-stone-100 px-4 py-3 text-sm text-stone-500">{empty}</p>;
  return (
    <ul className="divide-y divide-stone-100 border-t border-stone-200 bg-stone-50/50">
      {docs.map((d) => (
        <li key={d.id}>
          <Link href={`/w/${slug}/${PATH[d.kind]}/${d.id}`} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-stone-50">
            <span className="min-w-0 flex-1"><span className="block truncate">{d.party}</span><span className="block text-xs text-stone-500">{d.number}</span></span>
            {accepted ? <Badge tone="green">Convert to invoice</Badge> : d.days < 0
              ? <Badge tone="red">{-d.days} day{d.days === -1 ? "" : "s"} late</Badge>
              : <Badge tone={d.days === 0 ? "amber" : "blue"}>{d.days === 0 ? "Due today" : `Due in ${d.days} day${d.days === 1 ? "" : "s"}`}</Badge>}
            <span className="w-28 text-right font-mono">{fmt(d.amount)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
