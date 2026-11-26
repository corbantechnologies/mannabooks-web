"use client";

import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Button, ErrorState, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { DATE_KIND } from "@/lib/portfolios";
import { useWorkspace } from "@/lib/workspace";

/**
 * The portfolio report, to print or save as PDF. "For the client" shows their services, prices, dates and price
 * history; "Internal" adds your costs, margins and what each should cost at your standard margin.
 */
export default function PortfolioReportPage() {
  const { id } = useParams<{ id: string }>();
  const { slug, context } = useWorkspace();
  const [internal, setInternal] = useState(false);
  const q = useQuery({ queryKey: ["portfolio", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/portfolios/{id}/", { params: { path: { workspace: slug, id } } })) });
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} />;
  const d = q.data;
  const ws = context.workspace;
  const active = d.services.filter((s) => s.status === "active");
  const th = "border-b border-stone-300 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-stone-500";
  const td = "border-b border-stone-100 py-1.5 align-top";
  const num = `${td} text-right font-mono`;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-100 py-6 print:static print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-end gap-2 px-4 print:hidden">
        <label className="mr-auto flex items-center gap-2 text-sm"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal: show costs and margins</label>
        <Button variant="secondary" onClick={() => history.back()}>Back</Button>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Print or save PDF</Button>
      </div>
      <article className="mx-auto min-h-[297mm] max-w-[210mm] bg-white p-[14mm] text-[13px] text-stone-900 shadow print:shadow-none">
        <header className="flex justify-between gap-6 border-b border-stone-300 pb-5">
          <div>
            <h1 className="text-xl font-bold">{ws.legal_name || ws.name}</h1>
            <p className="text-stone-600">{[ws.phone, ws.email].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold uppercase tracking-wide text-stone-800">{internal ? "Portfolio review" : "Services summary"}</p>
            <p>{d.customer_name}</p>
            <p className="text-stone-600">As at {fmtDate(d.today)}</p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-3 gap-4">
          <div><p className="text-xs text-stone-500">A month</p><p className="font-mono text-base">{fmt(d.monthly_revenue)}</p></div>
          <div><p className="text-xs text-stone-500">A year</p><p className="font-mono text-base">{fmt(d.yearly_revenue)}</p></div>
          {internal ? (
            <div><p className="text-xs text-stone-500">Margin a month</p><p className="font-mono text-base">{fmt(d.monthly_margin)}{d.margin_percent != null && ` (${Number(d.margin_percent).toFixed(0)}%)`}</p></div>
          ) : (
            <div><p className="text-xs text-stone-500">Services</p><p className="font-mono text-base">{active.length}</p></div>
          )}
        </section>

        <h2 className="mt-6 mb-1 font-semibold">Services</h2>
        <table className="w-full border-collapse">
          <thead><tr>
            <th className={th}>Service</th><th className={`${th} text-right`}>Price</th><th className={th}>Billed</th><th className={`${th} text-right`}>A month</th>
            {internal && <><th className={`${th} text-right`}>Cost a month</th><th className={`${th} text-right`}>Margin</th><th className={`${th} text-right`}>At {Number(d.target_margin)}%</th></>}
          </tr></thead>
          <tbody>
            {active.map((s) => (
              <tr key={s.id}>
                <td className={td}>{s.name}<span className="block text-xs text-stone-500">{s.group_name ? `${s.group_name} · ` : ""}{s.kind_label}{s.contract_end ? ` · contract to ${fmtDate(s.contract_end)}` : ""}</span>
                  {s.apps.filter((a) => a.is_active).map((a) => <span key={a.id} className="block pl-3 text-xs text-stone-600">{a.name}: {fmt(a.monthly_price)} a month{internal ? ` (cost ${fmt(a.monthly_cost)})` : ""}</span>)}
                </td>
                <td className={num}>{fmt(s.per_cycle)}</td>
                <td className={td}>{s.billing_cycle_label}</td>
                <td className={num}>{s.billing_cycle === "one_off" ? "-" : fmt(s.monthly_revenue)}</td>
                {internal && <><td className={num}>{fmt(s.monthly_cost)}</td><td className={`${num} ${s.loses_money ? "text-red-700" : ""}`}>{fmt(s.monthly_margin)}</td><td className={num}>{s.fair_monthly != null ? fmt(s.fair_monthly) : "-"}</td></>}
              </tr>
            ))}
            <tr className="font-semibold">
              <td className={td} colSpan={3}>Total</td><td className={num}>{fmt(d.monthly_revenue)}</td>
              {internal && <><td className={num}>{fmt(d.monthly_cost)}</td><td className={num}>{fmt(d.monthly_margin)}</td><td className={num}>{fmt(d.fair_monthly)}</td></>}
            </tr>
          </tbody>
        </table>

        {d.dates.length > 0 && (
          <>
            <h2 className="mt-6 mb-1 font-semibold">Coming up (90 days)</h2>
            <table className="w-full border-collapse"><tbody>
              {d.dates.filter((x) => internal || x.kind !== "pay_supplier").map((x, i) => (
                <tr key={i}><td className={`${td} w-28`}>{fmtDate(x.date)}</td><td className={td}>{DATE_KIND[x.kind].label}: {x.label}</td><td className={num}>{x.amount != null ? fmt(x.amount) : ""}</td></tr>
              ))}
            </tbody></table>
          </>
        )}

        {d.history.some((h) => !["added", "removed"].includes(h.field)) && (
          <>
            <h2 className="mt-6 mb-1 font-semibold">Price changes</h2>
            <table className="w-full border-collapse"><tbody>
              {d.history.filter((h) => !["added", "removed"].includes(h.field) && (internal || !h.field.includes("cost"))).map((h) => (
                <tr key={h.id}><td className={`${td} w-28`}>{fmtDate(h.changed_on)}</td><td className={td}>{h.what}: {h.field} {h.old_value} to {h.new_value}{h.reason ? ` (${h.reason})` : ""}</td></tr>
              ))}
            </tbody></table>
          </>
        )}

        {d.documents.length > 0 && (
          <>
            <h2 className="mt-6 mb-1 font-semibold">Agreements</h2>
            <table className="w-full border-collapse"><tbody>
              {d.documents.map((x) => <tr key={x.id}><td className={td}>{x.title}</td><td className={td}>{x.kind_label}</td><td className={td}>{x.expires_on ? `Expires ${fmtDate(x.expires_on)}` : ""}</td></tr>)}
            </tbody></table>
          </>
        )}
      </article>
    </div>
  );
}
