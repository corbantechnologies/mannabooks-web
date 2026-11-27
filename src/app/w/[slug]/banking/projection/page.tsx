"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { ChevronDown, ChevronRight, CircleAlert, Plus } from "lucide-react";
import { Fragment, useState } from "react";

import { MonthChart } from "@/components/charts";
import { ask } from "@/components/confirm";
import { Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

type Planned = components["schemas"]["PlannedCashItem"];
const REPEAT = [["once", "Once"], ["weekly", "Every week"], ["monthly", "Every month"], ["quarterly", "Every 3 months"], ["half_yearly", "Every 6 months"], ["yearly", "Every year"]] as const;

/** Where cash is heading, month by month, if nothing new is decided, and when it would go below the floor. */
export default function CashProjectionPage() {
  const { slug, can } = useWorkspace();
  const [months, setMonths] = useState("6");
  const [floor, setFloor] = useState("");
  const [out, setOut] = useState<Set<string>>(new Set());
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [openSource, setOpenSource] = useState<string | null>(null);
  const [editing, setEditing] = useState<Planned | null | undefined>(undefined);
  const leaveOut = [...out].sort().join(",");
  const q = useQuery({
    queryKey: ["cash-forecast", slug, months, floor, leaveOut],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/reports/cash-forecast/", {
      params: { path: { workspace: slug }, query: { months: Number(months), ...(floor ? { floor: Number(floor) } : {}), ...(leaveOut ? { leave_out: leaveOut } : {}) } },
    })),
  });
  const planned = useQuery({
    queryKey: ["cash-planned", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/reports/cash-forecast/planned/", { params: { path: { workspace: slug } } })),
  });
  const history = useQuery({
    queryKey: ["history", slug, 6],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/reports/history/", { params: { path: { workspace: slug }, query: { months: 6 } } })),
  });
  const f = q.data;
  const past = (history.data ?? []).slice(0, -1).map((h) => ({ label: h.label, cash: Number(h.cash) }));
  const ahead = (f?.months ?? []).map((m) => ({ label: m.label, cash: Number(m.closing) }));
  const chartRows = [...past, ...ahead];
  const toggle = (k: string) => setOut((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const manage = can("banking.spend");
  const sources = f?.included ?? [];

  return (
    <div className="w-full">
      <PageHeader title="Cash projection" guide="banking"
        description="Where cash is heading if nothing new is decided: today's cash, plus everything MannaBooks knows is coming in and going out, and what you plan here. Untick a line below to leave it out."
        actions={manage ? <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> Planned payment</Button> : undefined} />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Look ahead"><Select value={months} onChange={(e) => setMonths(e.target.value)}>{["3", "6", "9", "12", "18"].map((m) => <option key={m} value={m}>{m} months</option>)}</Select></Field>
        <Field label="Warn me below" hint="Blank: the accounts' minimums"><Input type="number" min="0" className="w-40" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="e.g. 150000" /></Field>
      </div>
      {q.isLoading ? <Spinner /> : q.error ? <ErrorState error={q.error} /> : f && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Card className="p-4"><p className="text-xs uppercase tracking-wide text-stone-500">Cash and bank today</p><p className="mt-1 break-words font-mono text-xl font-semibold tabular-nums">{fmt(f.cash_now)}</p></Card>
            <Card className="p-4"><p className="text-xs uppercase tracking-wide text-stone-500">In {f.months.length} months</p><p className={clsx("mt-1 break-words font-mono text-xl font-semibold tabular-nums", Number(f.months.at(-1)?.closing) < 0 && "text-red-700")}>{fmt(f.months.at(-1)?.closing ?? 0)}</p></Card>
            <Card className={clsx("p-4", f.first_below && "border-red-300 bg-red-50")}>
              <p className="text-xs uppercase tracking-wide text-stone-500">Below the floor</p>
              {f.floor == null ? <p className="mt-1 text-sm text-stone-500">Set a floor above, or a minimum on your accounts.</p>
                : f.first_below ? <p className="mt-1 flex items-center gap-1.5 text-lg font-semibold text-red-700"><CircleAlert className="h-5 w-5" />{new Date(`${f.first_below}T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
                : <p className="mt-1 text-lg font-semibold text-emerald-700">Not in this period</p>}
            </Card>
          </div>
          <Card className="mb-4 p-4">
            <h2 className="mb-2 text-sm font-semibold">Cash: the last months, then the projection (dashed)</h2>
            <MonthChart rows={chartRows} floor={f.floor != null ? Number(f.floor) : null}
              series={[{ key: "cash", label: "Cash and bank", color: "#047857", kind: "line", dashedFrom: past.length }]} />
          </Card>
          <Card className="mb-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr><th className="px-4 py-2 text-left font-medium">Month</th><th className="px-3 py-2 text-right font-medium">Start</th><th className="px-3 py-2 text-right font-medium">Money in</th><th className="px-3 py-2 text-right font-medium">Money out</th><th className="px-3 py-2 text-right font-medium">End</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {f.months.map((m) => (
                  <Fragment key={m.month}>
                    <tr className={clsx("cursor-pointer hover:bg-stone-50", f.floor != null && Number(m.closing) < Number(f.floor) && "bg-red-50/60")} onClick={() => setOpenMonth(openMonth === m.month ? null : m.month)}>
                      <td className="px-4 py-2"><span className="flex items-center gap-1">{openMonth === m.month ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{m.label}</span></td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(m.opening)}</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-700">{fmt(m.money_in)}</td>
                      <td className="px-3 py-2 text-right font-mono text-red-700">{fmt(m.money_out)}</td>
                      <td className={clsx("px-3 py-2 text-right font-mono font-semibold", Number(m.closing) < 0 && "text-red-700")}>{fmt(m.closing)}</td>
                    </tr>
                    {openMonth === m.month && (
                      <tr><td colSpan={5} className="bg-stone-50 px-4 py-3">
                        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                          {(["in", "out"] as const).map((dir) => (
                            <div key={dir}>
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">{dir === "in" ? "Money in" : "Money out"}</p>
                              {sources.filter((s) => s.direction === dir && !s.left_out && Number(m.parts[s.key]) !== 0).map((s) => (
                                <p key={s.key} className="flex justify-between gap-4 text-sm"><span>{s.label}</span><span className="font-mono">{fmt(m.parts[s.key])}</span></p>
                              ))}
                              {!sources.some((s) => s.direction === dir && !s.left_out && Number(m.parts[s.key]) !== 0) && <p className="text-sm text-stone-500">Nothing.</p>}
                            </div>
                          ))}
                        </div>
                      </td></tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="mb-4 grid gap-4 xl:grid-cols-2">
            {(["in", "out"] as const).map((dir) => (
              <Card key={dir}>
                <div className="border-b border-stone-100 px-4 py-2"><h2 className="text-sm font-semibold">What&apos;s included: money {dir}</h2>
                  <p className="text-xs text-stone-500">Totals for the {f.months.length} months. Untick to leave a line out; click it to see what makes it up.</p></div>
                <ul className="divide-y divide-stone-100">
                  {sources.filter((s) => s.direction === dir).map((s) => (
                    <li key={s.key} className="px-4 py-2">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1" checked={!s.left_out} onChange={() => toggle(s.key)} aria-label={`Include ${s.label}`} />
                        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpenSource(openSource === s.key ? null : s.key)} disabled={!s.lines.length}>
                          <span className={clsx("block text-sm font-medium", s.left_out && "text-stone-400 line-through")}>{s.label}{s.lines.length > 0 && <span className="ml-1 text-xs font-normal text-brand-700">{openSource === s.key ? "hide" : `${s.lines.length} ${s.lines.length === 1 ? "item" : "items"}`}</span>}</span>
                          <span className="block text-xs text-stone-500">{s.how}</span>
                        </button>
                        <span className={clsx("shrink-0 font-mono text-sm", s.left_out && "text-stone-400")}>{fmt(s.total)}</span>
                      </div>
                      {openSource === s.key && (
                        <ul className="mt-2 space-y-0.5 pl-7 text-xs">
                          {s.lines.map((ln, i) => (
                            <li key={i} className="flex justify-between gap-3"><span className="text-stone-500">{fmtDate(ln.date)}{ln.overdue ? " (overdue)" : ""}</span><span className="min-w-0 flex-1 truncate">{ln.label}</span><span className="font-mono">{fmt(ln.amount)}</span></li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          <Card className="mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-4 py-2">
              <div><h2 className="text-sm font-semibold">Planned payments and money in</h2>
                <p className="text-xs text-stone-500">What isn&apos;t in the books yet: bonuses, loan repayments, subscriptions, a grant. Once or on a schedule.</p></div>
              {manage && <Button variant="secondary" onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> Add</Button>}
            </div>
            {(planned.data ?? []).length === 0 ? <p className="p-4 text-sm text-stone-500">Nothing planned yet.</p> : (
              <ul className="divide-y divide-stone-100">
                {(planned.data ?? []).map((p) => (
                  <li key={p.id} className={clsx("flex flex-wrap items-center gap-3 px-4 py-2 text-sm", p.is_active === false && "opacity-50")}>
                    <span className={clsx("w-16 text-xs font-medium", p.direction === "in" ? "text-emerald-700" : "text-red-700")}>{p.direction === "in" ? "Money in" : "Money out"}</span>
                    <span className="min-w-0 flex-1">{p.name}<span className="block text-xs text-stone-500">{REPEAT.find((r) => r[0] === p.repeat)?.[1]} from {fmtDate(p.first_date)}{p.end_date ? ` to ${fmtDate(p.end_date)}` : ""}{p.notes ? ` · ${p.notes}` : ""}</span></span>
                    <span className="font-mono">{fmt(p.amount)}</span>
                    {manage && <button type="button" className="text-xs text-brand-700 hover:underline" onClick={() => setEditing(p)}>Change</button>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <p className="text-xs text-stone-500">It knows only what is in the books and what you plan here: a guide, not a promise. Something already in the books (a bill, a recurring invoice) needn&apos;t be planned again.</p>
        </>
      )}
      {editing !== undefined && <PlannedForm item={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}

function PlannedForm({ item, onClose }: { item: Planned | null; onClose: () => void }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: item?.name ?? "", direction: item?.direction ?? "out", amount: item?.amount ?? "", first_date: item?.first_date ?? "",
    repeat: item?.repeat ?? "once", end_date: item?.end_date ?? "", notes: item?.notes ?? "",
  });
  const done = () => { void qc.invalidateQueries({ queryKey: ["cash-planned", slug] }); void qc.invalidateQueries({ queryKey: ["cash-forecast", slug] }); onClose(); };
  const body = { ...f, end_date: f.repeat === "once" || !f.end_date ? null : f.end_date } as never;
  const save = useMutation({
    mutationFn: async () => item
      ? unwrap(await api.PATCH("/api/v1/w/{workspace}/reports/cash-forecast/planned/{id}/", { params: { path: { workspace: slug, id: item.id } }, body }))
      : unwrap(await api.POST("/api/v1/w/{workspace}/reports/cash-forecast/planned/", { params: { path: { workspace: slug } }, body })),
    onSuccess: done,
  });
  const remove = useMutation({
    mutationFn: async () => { await api.DELETE("/api/v1/w/{workspace}/reports/cash-forecast/planned/{id}/", { params: { path: { workspace: slug, id: item!.id } } }); },
    onSuccess: done,
  });
  return (
    <Modal open title={item ? `Change ${item.name}` : "Planned payment or money in"} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Field label="What"><Input required maxLength={160} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Year-end bonuses" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Money"><Select value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value as "in" | "out" })}><option value="out">Out (a payment)</option><option value="in">In</option></Select></Field>
          <Field label="Amount"><Input required type="number" inputMode="decimal" min="0.01" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <Field label={f.repeat === "once" ? "Date" : "First date"}><Input required type="date" value={f.first_date} onChange={(e) => setF({ ...f, first_date: e.target.value })} /></Field>
          <Field label="Repeats"><Select value={f.repeat} onChange={(e) => setF({ ...f, repeat: e.target.value as typeof f.repeat })}>{REPEAT.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
          {f.repeat !== "once" && <Field label="Stops after (optional)"><Input type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></Field>}
        </div>
        <Field label="Note (optional)"><Textarea rows={2} maxLength={255} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        <FormError error={save.error ?? remove.error} />
        <div className="flex flex-wrap justify-between gap-2">
          {item ? <Button type="button" variant="secondary" loading={remove.isPending} onClick={async () => { if (await ask(`Remove ${item.name} from the projection?`, { confirmLabel: "Remove", danger: true })) remove.mutate(); }}>Remove</Button> : <span />}
          <div className="flex gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
        </div>
      </form>
    </Modal>
  );
}
