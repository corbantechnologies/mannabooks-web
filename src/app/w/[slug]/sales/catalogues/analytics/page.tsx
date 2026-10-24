"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Card, EmptyState, ErrorState, Field, Input, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { datePresets } from "@/lib/api/control";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

/** How catalogues are doing: opens, quote requests, wins, and the products clients ask for most. */
export default function CatalogueAnalyticsPage() {
  const { slug, context } = useWorkspace();
  const presets = datePresets();
  const [preset, setPreset] = useState("all");
  const [range, setRange] = useState({ from: "", to: "" });
  const report = useQuery({
    queryKey: ["catalogue-analytics", slug, range],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/catalogues/analytics/", {
      params: { path: { workspace: slug }, query: { from: range.from || undefined, to: range.to || undefined } },
    })),
  });
  const d = report.data;
  const currency = context.workspace.currency;
  const t = d?.totals;
  const tiles = t ? [
    ["Opened", `${t.views}`, `across ${t.catalogues} catalogue${t.catalogues === 1 ? "" : "s"}, all time`],
    ["Quote requests", `${t.requests}`, `${currency} ${fmt(t.requested_value)} asked for`],
    ["Accepted", `${t.accepted}`, `${currency} ${fmt(t.accepted_value)} won`],
    ["Win rate", `${t.win_rate}%`, "of requests accepted"],
  ] : [];
  const top = d?.top_products ?? [];
  const most = Math.max(1, ...top.map((p) => p.times));
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/sales/catalogues`} className="text-sm text-stone-500 hover:underline">&larr; Catalogues</Link>
      <PageHeader title="Catalogue analytics" guide="catalogues" description="Which catalogues clients open, how many turn into quotations, and what they ask for." />
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-3">
        <Field label="Quotations dated">
          <Select value={preset} onChange={(e) => {
            setPreset(e.target.value);
            const p = presets.find((x) => x.key === e.target.value);
            setRange(p ? { from: p.from, to: p.to } : { from: "", to: "" });
          }}>
            <option value="all">Any time</option>{presets.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}<option value="custom">Custom</option>
          </Select>
        </Field>
        <Field label="From"><Input type="date" value={range.from} onChange={(e) => { setPreset("custom"); setRange((r) => ({ ...r, from: e.target.value })); }} /></Field>
        <Field label="To"><Input type="date" value={range.to} onChange={(e) => { setPreset("custom"); setRange((r) => ({ ...r, to: e.target.value })); }} /></Field>
      </Card>
      {report.isLoading ? <Spinner /> : report.error ? <ErrorState error={report.error} /> : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map(([label, value, note]) => (
              <Card key={label} className="p-4">
                <p className="text-sm text-stone-500">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-stone-900">{value}</p>
                <p className="mt-1 text-xs text-stone-500">{note}</p>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
            <Card>
              <h2 className="border-b border-stone-100 px-4 py-3 font-semibold">By catalogue</h2>
              {!d!.catalogues.length ? <EmptyState title="No catalogues yet">Make one in Catalogues and share it.</EmptyState> : (
                <Table head={["Catalogue", "Opened", "Requests", "Accepted", "Won", "Requests per open"]}>
                  {d!.catalogues.map((c) => (
                    <tr key={c.id} className="hover:bg-stone-50">
                      <Td><Link href={`/w/${slug}/sales/catalogues/${c.id}`} className="hover:underline">{c.name}</Link>
                        <div className="text-xs text-stone-500">{c.customer_name ?? "Anyone with the link"}{c.is_active ? "" : " · closed"}</div></Td>
                      <Td className="text-right">{c.views}</Td>
                      <Td className="text-right">{c.requests}</Td>
                      <Td className="text-right">{c.accepted}{c.requests > 0 && <div className="text-xs text-stone-500">{c.win_rate}%</div>}</Td>
                      <Td className="text-right font-mono">{fmt(c.accepted_value)}</Td>
                      <Td className="text-right">{c.views ? `${c.request_rate}%` : "-"}</Td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>
            <Card className="h-fit">
              <h2 className="border-b border-stone-100 px-4 py-3 font-semibold">Most requested</h2>
              {!top.length ? <p className="p-4 text-sm text-stone-500">Nothing requested{range.from ? " in this period" : " yet"}.</p> : (
                <ul className="space-y-3 p-4">
                  {top.map((p) => (
                    <li key={p.product_id} className="text-sm">
                      <div className="flex justify-between gap-2"><span className="truncate">{p.name}</span><span className="shrink-0 text-stone-500">{p.times} quote{p.times === 1 ? "" : "s"}</span></div>
                      <div className="mt-1 h-2 rounded-full bg-stone-100"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${(p.times / most) * 100}%` }} /></div>
                      <p className="mt-0.5 text-xs text-stone-500">{Number(p.quantity)} asked for · {currency} {fmt(p.value)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <p className="mt-4 text-xs text-stone-500">Opens count every time the link is opened, since the catalogue was made{range.from ? `; requests and wins count quotations dated ${fmtDate(range.from)} to ${fmtDate(range.to || range.from)}` : ""}.</p>
        </>
      )}
    </div>
  );
}
