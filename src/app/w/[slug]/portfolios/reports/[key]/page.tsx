"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Download, Printer } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { query, ReportScopePicker, scopeFrom, type ReportScope } from "@/components/portfolio-report-scope";
import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { downloadCsv, fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

type Report = components["schemas"]["PortfolioReport"];
type Kind = components["schemas"]["PortfolioReportColumn"]["kind"];
type Row = Record<string, unknown>;

const RIGHT: Kind[] = ["money", "number", "percent"];

function show(v: unknown, kind: Kind): string {
  if (v === null || v === undefined || v === "") return kind === "text" ? "" : "-";
  if ((kind === "date" || kind === "month") && !/^\d{4}-\d{2}/.test(String(v))) return String(v);  // e.g. "Total"
  switch (kind) {
    case "money": return fmt(v as string);
    case "percent": { const n = Number(v); return `${Math.abs(n) >= 10 || Number.isInteger(n) ? n.toFixed(0) : n.toFixed(1)}%`; }
    case "number": return Number(v).toLocaleString();
    case "date": return fmtDate(String(v));
    case "month": return new Date(`${String(v).slice(0, 10)}T00:00:00`).toLocaleDateString("en-KE", { month: "short", year: "numeric" });
    default: return String(v);
  }
}

/** One portfolio report: headline figures, then tables. Filters live in the address, so a report can be bookmarked or shared. */
export default function PortfolioReportPage() {
  const { key } = useParams<{ key: string }>();
  const { slug, context } = useWorkspace();
  const router = useRouter();
  const sp = useSearchParams();
  const scope = scopeFrom(sp);
  const extra = { start: sp.get("start") ?? "", end: sp.get("end") ?? "", months: sp.get("months") ?? "", as_at: sp.get("as_at") ?? "" };
  const go = (s: ReportScope, e = extra) => router.replace(`/w/${slug}/portfolios/reports/${key}${query({ ...s, ...e })}`);
  const info = useQuery({
    queryKey: ["portfolio-reports", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/portfolios/reports/", { params: { path: { workspace: slug } } })),
  });
  const meta = info.data?.find((r) => r.key === key);
  const needsClient = !!meta?.filters.includes("client_required") && !scope.portfolio;
  const q = useQuery({
    queryKey: ["portfolio-report", slug, key, scope, extra],
    enabled: !!meta && !needsClient,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/portfolios/reports/{key}/", {
      params: { path: { workspace: slug, key }, query: Object.fromEntries(Object.entries({ ...scope, ...extra }).filter(([, v]) => v)) },
    })),
  });
  const d = q.data;
  function exportCsv() {
    if (!d) return;
    const rows: (string | number)[][] = [[d.title], [d.scope_label, d.period_label], []];
    for (const s of d.sections) {
      rows.push([s.title], s.columns.map((c) => c.label));
      for (const r of s.rows as Row[]) rows.push(s.columns.map((c) => (r[c.key] ?? "") as string));
      if (s.total) rows.push(s.columns.map((c) => ((s.total as Row)[c.key] ?? "") as string));
      rows.push([]);
    }
    downloadCsv(`${d.key}-${d.scope_label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${d.generated_on}.csv`, rows);
  }
  if (info.isLoading) return <Spinner />;
  if (info.error) return <ErrorState error={info.error} />;
  if (!meta) return <EmptyState title="There's no such report" />;
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/portfolios/reports${query(scope)}`} className="text-sm text-stone-500 hover:underline print:hidden">&larr; Portfolio reports</Link>
      <div className="hidden print:mb-3 print:block">
        <p className="text-lg font-bold">{context.workspace.legal_name || context.workspace.name}</p>
      </div>
      <PageHeader title={meta.title} guide="client-portfolios"
        description={d ? <>{d.scope_label} · {d.period_label}</> : meta.description}
        actions={d ? (
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print or PDF</Button>
            <Button variant="secondary" onClick={exportCsv}><Download className="h-4 w-4" /> CSV</Button>
          </div>
        ) : undefined} />

      <Card className="mb-4 space-y-3 p-4 print:hidden">
        <ReportScopePicker value={scope} onChange={(s) => go(s)} clientRequired={meta.filters.includes("client_required")} />
        {(meta.filters.includes("period") || meta.filters.includes("ahead") || meta.filters.includes("as_at")) && (
          <div className="flex flex-wrap items-end gap-3">
            {meta.filters.includes("period") && <>
              <Field label="From month"><Input type="month" className="w-44" value={extra.start || (d?.period_start ?? "").slice(0, 7)} onChange={(e) => go(scope, { ...extra, start: e.target.value })} /></Field>
              <Field label="To month"><Input type="month" className="w-44" value={extra.end || (d?.period_end ?? "").slice(0, 7)} onChange={(e) => go(scope, { ...extra, end: e.target.value })} /></Field>
              {(extra.start || extra.end) && <Button variant="ghost" onClick={() => go(scope, { ...extra, start: "", end: "" })}>Default period</Button>}
            </>}
            {meta.filters.includes("ahead") && (
              <Field label="Months ahead">
                <Select className="w-40" value={extra.months || "12"} onChange={(e) => go(scope, { ...extra, months: e.target.value === "12" ? "" : e.target.value })}>
                  {[3, 6, 12, 18, 24].map((n) => <option key={n} value={n}>{n} months</option>)}
                </Select>
              </Field>
            )}
            {meta.filters.includes("as_at") && (
              <Field label="As at"><Input type="date" className="w-44" value={extra.as_at} onChange={(e) => go(scope, { ...extra, as_at: e.target.value })} /></Field>
            )}
          </div>
        )}
        <p className="text-xs text-stone-500">{meta.description}</p>
      </Card>

      {needsClient ? <EmptyState title="Choose a client">This report is for one client: choose them above.</EmptyState>
        : q.isLoading ? <Spinner />
        : q.error || !d ? <ErrorState error={q.error} />
        : <ReportBody d={d} slug={slug} />}
    </div>
  );
}

function ReportBody({ d, slug }: { d: Report; slug: string }) {
  return (
    <>
      {d.client_facing && <p className="mb-4 rounded-md bg-brand-50 px-4 py-2 text-sm text-brand-900 print:hidden">Safe to send to the client: it shows no costs or margins.</p>}
      {d.stats.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 print:grid-cols-5">
          {d.stats.map((s) => (
            <Card key={s.label} className="p-3 print:shadow-none">
              <p className="text-xs text-stone-500">{s.label}</p>
              <p className={clsx("break-words font-mono text-base tabular-nums sm:text-lg", s.bad && "text-red-700")}>{show(s.value, s.kind)}</p>
            </Card>
          ))}
        </div>
      )}
      {d.sections.map((s) => (
        <Card key={s.title} className="mb-4 print:break-inside-auto print:shadow-none">
          <div className="border-b border-stone-100 px-4 py-2">
            <h2 className="text-sm font-semibold">{s.title}</h2>
            {s.note && <p className="text-xs text-stone-500">{s.note}</p>}
          </div>
          {s.rows.length === 0 ? <p className="p-4 text-sm text-stone-500">Nothing here.</p> : (
            <Table head={s.columns.map((c) => c.label)}>
              {(s.rows as Row[]).map((r, i) => {
                const links = (r._links ?? {}) as Record<string, string>;
                return (
                  <tr key={i} className={clsx(r._bad === true && "bg-red-50/60")}>
                    {s.columns.map((c) => {
                      const text = show(r[c.key], c.kind);
                      return (
                        <Td key={c.key} className={clsx(RIGHT.includes(c.kind) && "text-right font-mono tabular-nums", r._bad === true && RIGHT.includes(c.kind) && c.key.includes("margin") && "text-red-700")}>
                          {links[c.key] ? <Link className="text-brand-700 hover:underline" href={`/w/${slug}/${links[c.key]}`}>{text}</Link> : text}
                        </Td>
                      );
                    })}
                  </tr>
                );
              })}
              {s.total && (
                <tr className="bg-stone-50 font-semibold">
                  {s.columns.map((c) => <Td key={c.key} className={clsx(RIGHT.includes(c.kind) && "text-right font-mono tabular-nums")}>
                    {(s.total as Row)[c.key] === undefined ? "" : show((s.total as Row)[c.key], c.kind)}
                  </Td>)}
                </tr>
              )}
            </Table>
          )}
        </Card>
      ))}
      {d.notes.length > 0 && (
        <ul className="mb-4 list-disc space-y-1 pl-5 text-xs text-stone-500">{d.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      )}
      <p className="text-xs text-stone-400">Made {fmtDate(d.generated_on)}. Amounts in the business&apos;s currency.</p>
    </>
  );
}
