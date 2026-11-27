"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import Link from "next/link";

import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { PresenceDot, usePresence } from "@/components/presence";

/**
 * A department head's page: their people, leave waiting, the department's money against its budget, and late work reports.
 * Someone who works in a department and may see its budget (Budgets: view own) sees its people, money and budget only.
 */
export default function MyDepartmentPage() {
  const { slug, context } = useWorkspace();
  const mine = useQuery({
    queryKey: ["my-department", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/departments/mine/", { params: { path: { workspace: slug } } })),
  });
  const presence = usePresence(slug, (mine.data ?? []).flatMap((d) => d.members.map((m) => m.id)));
  if (mine.isLoading) return <Spinner />;
  if (mine.error) return <ErrorState error={mine.error} />;
  const depts = mine.data ?? [];
  const cur = context.workspace.currency;
  return (
    <div className="w-full">
      <PageHeader title={depts.length === 1 ? depts[0].name : "My departments"}
        description={depts.some((d) => d.is_head)
          ? `The department${depts.length === 1 ? "" : "s"} you head${depts.some((d) => !d.is_head) ? " or work in" : ""}: people, leave, money and reports. Amounts in ${cur}.`
          : `Your department: its people, and its money against its budget. Amounts in ${cur}.`} />
      {depts.length === 0 && <Card><EmptyState title="You don't head a department">An admin sets the head of each department under Departments.</EmptyState></Card>}
      <div className="space-y-8">
        {depts.map((d) => {
          const away = d.members.filter((m) => m.away_until);
          return (
            <section key={d.id} className="space-y-4">
              {depts.length > 1 && <h2 className="text-lg font-semibold text-stone-900">{d.name}{!d.is_head && <span className="ml-2 text-sm font-normal text-stone-500">you work here</span>}</h2>}
              <div className={clsx("grid gap-3 sm:grid-cols-2", d.is_head ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
                <Tile label="People" value={String(d.members.length)} note={away.length ? `${away.length} on leave today` : "Everyone in"} />
                {d.is_head && <Tile label="Leave waiting" value={String(d.leave_waiting.length)} note={d.leave_waiting.length ? "for your decision" : "Nothing waiting"} alert={d.leave_waiting.length > 0} href={`/w/${slug}/leave`} />}
                <Tile label="Net this month" value={fmt(d.month.net)} note={`In ${fmt(d.month.income)} · costs ${fmt(d.month.costs)}`} alert={Number(d.month.net) < 0} />
                {d.is_head ? <Tile label="Reports late" value={String(d.reports_late.length)} note={`${d.reports_due_soon} due in the next 7 days`} alert={d.reports_late.length > 0} href={`/w/${slug}/work-reports`} />
                  : <Tile label="Costs this year" value={d.year ? fmt(d.year.costs) : "-"} note={d.budget ? `budget to date ${fmt(d.budget.costs_ytd_budget)}` : "No approved budget"}
                      alert={!!d.budget && !!d.year && Number(d.year.costs) > Number(d.budget.costs_ytd_budget)} />}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <h3 className="border-b border-stone-200 px-4 py-2.5 text-sm font-semibold">People</h3>
                  <ul className="divide-y divide-stone-100">
                    {d.members.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                        <span className="flex min-w-0 items-start gap-1.5"><PresenceDot p={presence[m.id]} className="mt-1.5" /><span className="min-w-0">{d.is_head ? <Link href={`/w/${slug}/employees/${m.id}`} className="block truncate hover:underline">{m.name}</Link> : <span className="block truncate">{m.name}</span>}<span className="block text-xs text-stone-500">{m.job_title || "-"}</span></span></span>
                        {m.away_until ? <Badge tone="amber">On leave until {fmtDate(m.away_until)}</Badge> : !m.has_login ? <span className="text-xs text-stone-400">No sign-in</span> : null}
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card>
                  <h3 className="border-b border-stone-200 px-4 py-2.5 text-sm font-semibold">{d.year_name ? `${d.year_name} so far` : "This year"}</h3>
                  {!d.year ? <p className="p-4 text-sm text-stone-500">No financial year covers today.</p> : (
                    <dl className="divide-y divide-stone-100 text-sm">
                      <Row label="Income" value={d.year.income} budget={d.budget?.income_ytd_budget} higherIsGood />
                      <Row label="Costs" value={d.year.costs} budget={d.budget?.costs_ytd_budget} />
                      <Row label="Net" value={d.year.net} budget={d.budget ? String(Number(d.budget.income_ytd_budget) - Number(d.budget.costs_ytd_budget)) : undefined} higherIsGood />
                    </dl>
                  )}
                  <p className="border-t border-stone-100 px-4 py-2 text-xs text-stone-500">
                    {d.budget ? <>Against {d.is_head ? <Link className="text-brand-700 hover:underline" href={`/w/${slug}/accounting/budgets/${d.budget.id}`}>{d.budget.name}</Link> : d.budget.name}, to date. </> : "No approved department budget this year. "}
                    Counts everything tagged with {d.name} or one of its cost centres.
                  </p>
                </Card>
              </div>
              {d.is_head && <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <h3 className="border-b border-stone-200 px-4 py-2.5 text-sm font-semibold">Leave waiting</h3>
                  {d.leave_waiting.length === 0 ? <p className="p-4 text-sm text-stone-500">Nothing waiting.</p> : (
                    <ul className="divide-y divide-stone-100">
                      {d.leave_waiting.map((r) => (
                        <li key={r.id} className="px-4 py-2 text-sm">
                          <Link href={`/w/${slug}/leave`} className="hover:underline">{r.employee}</Link>
                          <span className="block text-xs text-stone-500">{r.leave_type}, {Number(r.days)} days, {fmtDate(r.start_date)} to {fmtDate(r.end_date)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
                <Card>
                  <h3 className="border-b border-stone-200 px-4 py-2.5 text-sm font-semibold">Work reports late</h3>
                  {d.reports_late.length === 0 ? <p className="p-4 text-sm text-stone-500">None late.</p> : (
                    <ul className="divide-y divide-stone-100">
                      {d.reports_late.map((s) => (
                        <li key={s.id} className="px-4 py-2 text-sm">{s.employee}<span className="block text-xs text-stone-500">{s.title}, due {fmtDate(s.due_date)}</span></li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Tile({ label, value, note, alert, href }: { label: string; value: string; note?: string; alert?: boolean; href?: string }) {
  const body = (
    <Card className="h-full p-4 transition-colors hover:border-brand-300">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className={clsx("mt-1 font-mono text-xl font-semibold", alert ? "text-red-700" : "text-stone-900")}>{value}</p>
      {note && <p className="mt-0.5 text-xs text-stone-500">{note}</p>}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function Row({ label, value, budget, higherIsGood }: { label: string; value: string; budget?: string; higherIsGood?: boolean }) {
  const diff = budget !== undefined ? Number(value) - Number(budget) : null;
  const good = diff === null ? null : higherIsGood ? diff >= 0 : diff <= 0;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2">
      <dt className="text-stone-600">{label}</dt>
      <dd className="text-right">
        <span className="font-mono">{fmt(value)}</span>
        {budget !== undefined && <span className={clsx("block text-xs", good ? "text-green-700" : "text-red-700")}>budget {fmt(budget)} · {good ? "on track" : higherIsGood ? "below" : "over"}</span>}
      </dd>
    </div>
  );
}
