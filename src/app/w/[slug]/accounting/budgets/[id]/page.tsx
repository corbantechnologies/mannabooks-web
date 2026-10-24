"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Download, Plus, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { ApprovalPanel } from "@/components/approval-panel";
import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner } from "@/components/ui";
import { useAccounts } from "@/lib/api/accounting";
import { api, unwrap } from "@/lib/api/client";
import { BUDGET_STATUS, type Budget, monthLabel, useApprovalStatus } from "@/lib/api/control";
import { downloadCsv, fmt, todayIso } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { ask } from "@/components/confirm";

type Row = { account_id: string; amounts: string[] };
const sum = (xs: (string | number)[]) => xs.reduce<number>((a, b) => a + (Number(b) || 0), 0);

function spread(total: number): string[] {
  const each = Math.floor((total / 12) * 100) / 100;
  const out = Array(12).fill(each.toFixed(2));
  out[11] = (total - each * 11).toFixed(2);
  return out;
}

export default function BudgetPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const path = { params: { path: { workspace: slug, id } } };
  const budget = useQuery({ queryKey: ["budget", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/budgets/{id}/", path)) });
  const approval = useApprovalStatus(slug, "budget", id);
  const [tab, setTab] = useState<"plan" | "actual">("plan");
  const act = useMutation({
    mutationFn: async (body: { action: "approve" | "reopen" | "fill_from_last_year"; uplift_percent?: string }) =>
      unwrap(await api.POST("/api/v1/w/{workspace}/budgets/{id}/action/", { ...path, body: body as never })),
    onSuccess: (b, v) => { toast.success(v.action === "fill_from_last_year" ? "Filled from last year" : BUDGET_STATUS[b.status ?? "draft"].label); setFilling(false); },
    onError: (e) => { if (!filling) toast.error(e.message); },
  });
  const remove = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/w/{workspace}/budgets/{id}/", path)),
    onSuccess: () => { toast.success("Budget deleted"); router.replace(`/w/${slug}/accounting/budgets`); },
    onError: (e) => toast.error(e.message),
  });
  const [filling, setFilling] = useState(false);
  const [uplift, setUplift] = useState("5");
  if (budget.isLoading) return <Spinner />;
  if (budget.error) return <ErrorState error={budget.error} />;
  const b = budget.data!;
  const draft = b.status === "draft";
  const editable = draft && can("budgets.manage");
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/accounting/budgets`} className="text-sm text-stone-500 hover:underline">&larr; Budgets</Link>
      <PageHeader title={b.name} description={`${b.fiscal_year_name}, ${b.cost_center_name ?? b.project_name ?? "whole business"}`} guide="budgets"
        actions={<div className="flex flex-wrap gap-2">
          {editable && <Button variant="ghost" className="text-red-600" onClick={() => void ask("Delete this budget?").then((ok) => ok && remove.mutate())}>Delete</Button>}
          {editable && <Button variant="secondary" onClick={() => { act.reset(); setFilling(true); }}>Copy last year</Button>}
          {draft && can("budgets.approve") && !approval.data?.required && <Button loading={act.isPending} onClick={() => act.mutate({ action: "approve" })}>Approve</Button>}
          {!draft && can("budgets.approve") && <Button variant="secondary" onClick={() => void ask("Reopen to change the figures?").then((ok) => ok && act.mutate({ action: "reopen" }))}>Reopen</Button>}
        </div>} />
      <ApprovalPanel docType="budget" id={id} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge tone={BUDGET_STATUS[b.status ?? "draft"].tone}>{BUDGET_STATUS[b.status ?? "draft"].label}</Badge>
        {b.approved_by_name && <span className="text-sm text-stone-500">by {b.approved_by_name}</span>}
        <div className="ml-auto flex gap-1 rounded-md border border-stone-200 p-0.5">
          {(["plan", "actual"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={clsx("rounded px-3 py-1.5 text-sm", tab === t ? "bg-brand-700 text-white" : "text-stone-600 hover:bg-stone-100")}>
              {t === "plan" ? "Plan" : "Budget vs actual"}
            </button>
          ))}
        </div>
      </div>
      {tab === "plan" ? <PlanGrid key={b.id + (b.lines ?? []).length + b.status} budget={b} editable={editable} /> : <VersusActual id={id} months={b.months} />}
      <Modal open={filling} title="Copy last year's figures" onClose={() => setFilling(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); act.mutate({ action: "fill_from_last_year", uplift_percent: uplift || "0" }); }}>
          <p className="text-sm text-stone-600">Each income and expense account gets what it actually came to in the same month last year, plus the percentage below. This replaces what is in the plan now.</p>
          <Field label="Add (percent)" hint="For example 5 for inflation. Use 0 to copy as it was."><Input type="number" step="0.1" value={uplift} onChange={(e) => setUplift(e.target.value)} /></Field>
          <FormError error={act.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setFilling(false)}>Cancel</Button><Button type="submit" loading={act.isPending}>Copy</Button></div>
        </form>
      </Modal>
    </div>
  );
}

function PlanGrid({ budget, editable }: { budget: Budget; editable: boolean }) {
  const { slug } = useWorkspace();
  const accounts = useAccounts(slug);
  const [rows, setRows] = useState<Row[]>(() => (budget.lines ?? []).map((l) => ({ account_id: l.account_id, amounts: l.amounts.map(String) })));
  const [dirty, setDirty] = useState(false);
  const [adding, setAdding] = useState("");
  const all = (accounts.data ?? []).filter((a) => a.account_type === "income" || a.account_type === "expense");
  const byId = Object.fromEntries(all.map((a) => [a.id, a]));
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PATCH("/api/v1/w/{workspace}/budgets/{id}/", {
      params: { path: { workspace: slug, id: budget.id } }, body: { lines: rows.map((r) => ({ account_id: r.account_id, amounts: r.amounts.map((a) => a || "0") })) } as never,
    })),
    onSuccess: () => { toast.success("Budget saved"); setDirty(false); },
  });
  const update = (i: number, fn: (r: Row) => Row) => { setRows((prev) => prev.map((r, j) => (j === i ? fn(r) : r))); setDirty(true); };
  const groups = [
    { kind: "income", label: "Income" },
    { kind: "expense", label: "Spending" },
  ];
  const totalOf = (kind: string, m?: number) => rows.filter((r) => byId[r.account_id]?.account_type === kind).reduce((a, r) => a + (m === undefined ? sum(r.amounts) : Number(r.amounts[m]) || 0), 0);
  function exportCsv() {
    downloadCsv(`budget-${budget.name}.csv`, [["Code", "Account", ...budget.months.map(monthLabel), "Total"],
      ...rows.map((r) => [byId[r.account_id]?.code ?? "", byId[r.account_id]?.name ?? "", ...r.amounts, sum(r.amounts).toFixed(2)])]);
  }
  if (accounts.isLoading) return <Spinner />;
  return (
    <div className="space-y-3">
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="sticky left-0 z-10 bg-stone-50 px-3 py-2 text-left font-medium">Account</th>
                {budget.months.map((m) => <th key={m} className="px-1 py-2 text-right font-medium">{monthLabel(m)}</th>)}
                <th className="px-3 py-2 text-right font-medium">Year</th>
                {editable && <th />}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const groupRows = rows.map((r, i) => ({ r, i })).filter(({ r }) => byId[r.account_id]?.account_type === g.kind);
                return (
                  <GroupRows key={g.kind} label={g.label} months={budget.months.length} editable={editable}>
                    {groupRows.map(({ r, i }) => (
                      <tr key={r.account_id} className="border-t border-stone-100">
                        <td className="sticky left-0 z-10 bg-white px-3 py-1 whitespace-nowrap"><span className="mr-2 font-mono text-xs text-stone-400">{byId[r.account_id]?.code}</span>{byId[r.account_id]?.name}</td>
                        {r.amounts.map((a, m) => (
                          <td key={m} className="px-1 py-1">
                            {editable ? <input type="number" min="0" step="0.01" value={a} onChange={(e) => update(i, (x) => ({ ...x, amounts: x.amounts.map((v, k) => (k === m ? e.target.value : v)) }))}
                              className="w-24 rounded border border-stone-200 px-1.5 py-1 text-right font-mono text-xs focus:border-brand-600 focus:outline-none" /> : <span className="block text-right font-mono text-xs">{fmt(a)}</span>}
                          </td>
                        ))}
                        <td className="px-3 py-1">
                          {editable ? <input key={sum(r.amounts).toFixed(2)} type="number" min="0" step="0.01" defaultValue={sum(r.amounts).toFixed(2)} title="Type a year total to spread it evenly over the months"
                            onBlur={(e) => { const v = Number(e.target.value); if (Number.isFinite(v) && Math.abs(v - sum(r.amounts)) > 0.005) update(i, (x) => ({ ...x, amounts: spread(v) })); }}
                            className="w-28 rounded border border-stone-300 bg-stone-50 px-1.5 py-1 text-right font-mono text-xs font-semibold focus:border-brand-600 focus:outline-none" /> : <span className="block text-right font-mono text-xs font-semibold">{fmt(sum(r.amounts))}</span>}
                        </td>
                        {editable && <td className="px-1"><button onClick={() => { setRows((p) => p.filter((_, j) => j !== i)); setDirty(true); }} className="rounded p-1 text-stone-400 hover:bg-stone-100" aria-label="Remove"><X className="h-3.5 w-3.5" /></button></td>}
                      </tr>
                    ))}
                    <tr className="border-t border-stone-200 bg-stone-50 font-medium">
                      <td className="sticky left-0 z-10 bg-stone-50 px-3 py-1.5">Total {g.label.toLowerCase()}</td>
                      {budget.months.map((m, k) => <td key={m} className="px-1 py-1.5 text-right font-mono text-xs">{fmt(totalOf(g.kind, k))}</td>)}
                      <td className="px-3 py-1.5 text-right font-mono text-xs">{fmt(totalOf(g.kind))}</td>
                      {editable && <td />}
                    </tr>
                  </GroupRows>
                );
              })}
              <tr className="border-t-2 border-stone-300 bg-stone-100 font-semibold">
                <td className="sticky left-0 z-10 bg-stone-100 px-3 py-2">Planned profit</td>
                {budget.months.map((m, k) => <td key={m} className="px-1 py-2 text-right font-mono text-xs">{fmt(totalOf("income", k) - totalOf("expense", k))}</td>)}
                <td className="px-3 py-2 text-right font-mono text-xs">{fmt(totalOf("income") - totalOf("expense"))}</td>
                {editable && <td />}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      <div className="flex flex-wrap items-end justify-between gap-3">
        {editable ? (
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Add an account">
              <Select value={adding} onChange={(e) => setAdding(e.target.value)}>
                <option value="">Choose an income or expense account</option>
                {["income", "expense"].map((k) => (
                  <optgroup key={k} label={k === "income" ? "Income" : "Expenses"}>
                    {all.filter((a) => a.account_type === k && a.is_active && !rows.some((r) => r.account_id === a.id)).map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <Button variant="secondary" disabled={!adding} onClick={() => { setRows((p) => [...p, { account_id: adding, amounts: Array(12).fill("0") }]); setAdding(""); setDirty(true); }}><Plus className="h-4 w-4" /> Add</Button>
          </div>
        ) : <span className="text-sm text-stone-500">{budget.status === "approved" ? "Reopen the budget to change it." : ""}</span>}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4" /> CSV</Button>
          {editable && <Button disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>Save budget</Button>}
        </div>
      </div>
      {editable && <p className="text-xs text-stone-500">Tip: type a figure in the Year column to spread it evenly across the months.</p>}
      <FormError error={save.error} />
    </div>
  );
}

function GroupRows({ label, months, editable, children }: { label: string; months: number; editable: boolean; children: React.ReactNode }) {
  return (
    <>
      <tr><td colSpan={months + 2 + (editable ? 1 : 0)} className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</td></tr>
      {children}
    </>
  );
}

function VersusActual({ id, months }: { id: string; months: string[] }) {
  const { slug } = useWorkspace();
  const [through, setThrough] = useState(todayIso());
  const va = useQuery({
    queryKey: ["budget-vs-actual", slug, id, through],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/budgets/{id}/versus-actual/", { params: { path: { workspace: slug, id }, query: { through } } })),
  });
  const d = va.data;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Year to date up to"><Input type="date" value={through} onChange={(e) => setThrough(e.target.value)} /></Field>
        {d && <p className="pb-2 text-sm text-stone-500">{d.ytd_months} of 12 months ({months.length ? `${monthLabel(months[0])} to ${monthLabel(months[Math.max(d.ytd_months - 1, 0)])}` : ""})</p>}
      </div>
      <Card>
        {va.isLoading ? <div className="px-4"><Spinner /></div> : va.error ? <div className="p-4"><ErrorState error={va.error} /></div> : !d!.rows.length ? <EmptyState title="Nothing planned yet" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr><th className="px-4 py-2.5 text-left font-medium">Account</th><th className="px-3 py-2.5 text-right font-medium">Budget to date</th><th className="px-3 py-2.5 text-right font-medium">Actual to date</th>
                  <th className="px-3 py-2.5 text-right font-medium">Difference</th><th className="px-3 py-2.5 text-right font-medium">Year budget</th><th className="w-48 px-3 py-2.5 text-left font-medium">Year used</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {(["income", "expense"] as const).map((kind) => (
                  <VaGroup key={kind} kind={kind} rows={d!.rows.filter((r) => r.kind === kind)} totals={d![kind]} />
                ))}
                <tr className="border-t-2 border-stone-300 bg-stone-100 font-semibold">
                  <td className="px-4 py-2">Profit</td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(Number(d!.income.ytd_budget) - Number(d!.expense.ytd_budget))}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(Number(d!.income.ytd_actual) - Number(d!.expense.ytd_actual))}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(Number(d!.income.ytd_actual) - Number(d!.expense.ytd_actual) - (Number(d!.income.ytd_budget) - Number(d!.expense.ytd_budget)))}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(Number(d!.income.budget) - Number(d!.expense.budget))}</td><td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-xs text-stone-500">Difference: for income, actual less budget; for spending, budget less actual. Red means worse than planned.</p>
    </div>
  );
}

function VaGroup({ kind, rows, totals }: { kind: "income" | "expense"; rows: { account_id: string; code: string; name: string; ytd_budget: string; ytd_actual: string; variance: string; favourable: boolean; budget_total: string; used_percent: string | null }[]; totals: { budget: string; actual: string; ytd_budget: string; ytd_actual: string } }) {
  if (!rows.length) return null;
  const variance = kind === "income" ? Number(totals.ytd_actual) - Number(totals.ytd_budget) : Number(totals.ytd_budget) - Number(totals.ytd_actual);
  return (
    <>
      <tr><td colSpan={6} className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-stone-500">{kind === "income" ? "Income" : "Spending"}</td></tr>
      {rows.map((r) => {
        const used = r.used_percent === null ? null : Number(r.used_percent);
        return (
          <tr key={r.account_id}>
            <td className="px-4 py-2"><span className="mr-2 font-mono text-xs text-stone-400">{r.code}</span>{r.name}</td>
            <td className="px-3 py-2 text-right font-mono">{fmt(r.ytd_budget)}</td>
            <td className="px-3 py-2 text-right font-mono">{fmt(r.ytd_actual)}</td>
            <td className={clsx("px-3 py-2 text-right font-mono", r.favourable ? "text-emerald-700" : "text-red-700")}>{fmt(r.variance)}</td>
            <td className="px-3 py-2 text-right font-mono text-stone-500">{fmt(r.budget_total)}</td>
            <td className="px-3 py-2">{used !== null && (
              <div className="flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                <div className={clsx("h-full rounded-full", kind === "expense" && used > 100 ? "bg-red-500" : kind === "expense" && used > 85 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.min(used, 100)}%` }} />
              </div><span className="w-12 text-right font-mono text-xs">{used}%</span></div>
            )}</td>
          </tr>
        );
      })}
      <tr className="border-t border-stone-200 bg-stone-50 font-medium">
        <td className="px-4 py-2">Total {kind === "income" ? "income" : "spending"}</td>
        <td className="px-3 py-2 text-right font-mono">{fmt(totals.ytd_budget)}</td>
        <td className="px-3 py-2 text-right font-mono">{fmt(totals.ytd_actual)}</td>
        <td className={clsx("px-3 py-2 text-right font-mono", variance >= 0 ? "text-emerald-700" : "text-red-700")}>{fmt(variance)}</td>
        <td className="px-3 py-2 text-right font-mono text-stone-500">{fmt(totals.budget)}</td><td />
      </tr>
    </>
  );
}
