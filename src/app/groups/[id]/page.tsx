"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Plus, Printer } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { TopBar } from "@/components/top-bar";
import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { AccountOptions, useAccounts } from "@/lib/api/accounting";
import { api, unwrap } from "@/lib/api/client";
import { downloadCsv, fmt, fmtDate, todayIso } from "@/lib/format";
import { ask } from "@/components/confirm";

type Tab = "pl" | "bs" | "ic" | "companies";
type Section = { key: string; label: string; rows: { code: string; name: string; amounts: string[]; eliminations: string; total: string }[]; amounts: string[]; eliminations: string; total: string };

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("pl");
  const group = useQuery({ queryKey: ["group", id], queryFn: async () => unwrap(await api.GET("/api/v1/groups/{id}/", { params: { path: { id } } })) });
  const g = group.data;
  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Link href="/groups" className="text-sm text-stone-500 hover:underline print:hidden">&larr; Company groups</Link>
        {group.isLoading ? <Spinner /> : group.error ? <ErrorState error={group.error} /> : g && (
          <>
            <PageHeader title={g.name} guide="company-groups"
              description={`${g.companies.map((c) => c.name).join(", ") || "No companies yet"} · reported in ${g.currency}`} />
            <div className="mb-4 inline-flex flex-wrap rounded-md border border-stone-200 bg-white p-0.5 text-sm print:hidden">
              {([["pl", "Profit and loss"], ["bs", "Balance sheet"], ["ic", "Intercompany"], ["companies", "Companies"]] as [Tab, string][]).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setTab(k)} className={`rounded px-3 py-1 ${tab === k ? "bg-brand-50 font-medium text-brand-700" : "text-stone-600"}`}>{l}</button>
              ))}
            </div>
            {g.companies.length < 2 && tab !== "companies" ? (
              <Card><EmptyState title="Add at least two companies">Open the Companies tab and add the workspaces this group owns.</EmptyState></Card>
            ) : tab === "pl" ? <ProfitAndLoss id={id} /> : tab === "bs" ? <BalanceSheet id={id} /> : tab === "ic" ? <Intercompany id={id} companies={g.companies} /> : null}
            {tab === "companies" && <Companies id={id} isOwner={g.is_owner} companies={g.companies} />}
          </>
        )}
      </main>
    </>
  );
}

function ConsolidatedTable({ companies, sections, csvName }: { companies: { name: string }[]; sections: Section[]; csvName: string }) {
  const head = ["Account", ...companies.map((c) => c.name), "Eliminated", "Group"];
  return (
    <>
      <div className="mb-2 flex justify-end gap-2 print:hidden">
        <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
        <Button variant="secondary" onClick={() => downloadCsv(csvName, [head, ...sections.flatMap((s) => [
          [s.label], ...s.rows.map((r) => [`${r.code} ${r.name}`.trim(), ...r.amounts, r.eliminations, r.total]), [`Total ${s.label.toLowerCase()}`, ...s.amounts, s.eliminations, s.total]])])}>
          <Download className="h-4 w-4" /> CSV
        </Button>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>{head.map((h, i) => <th key={h} className={`px-3 py-2 ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {sections.map((s) => (
              <SectionRows key={s.key} section={s} />
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function SectionRows({ section: s }: { section: Section }) {
  if (!s.rows.length) return null;
  return (
    <>
      <tr className="bg-stone-50/60"><td colSpan={s.amounts.length + 3} className="px-3 pt-3 text-xs font-semibold uppercase tracking-wide text-stone-500">{s.label}</td></tr>
      {s.rows.map((r) => (
        <tr key={r.code || r.name} className="border-b border-stone-100">
          <td className="px-3 py-1.5">{r.code} {r.name}</td>
          {r.amounts.map((a, i) => <td key={i} className="px-3 py-1.5 text-right font-mono">{fmt(a)}</td>)}
          <td className="px-3 py-1.5 text-right font-mono text-amber-700">{Number(r.eliminations) ? `-${fmt(r.eliminations)}` : ""}</td>
          <td className="px-3 py-1.5 text-right font-mono font-medium">{fmt(r.total)}</td>
        </tr>
      ))}
      <tr className="border-b border-stone-200 font-semibold">
        <td className="px-3 py-1.5">Total {s.label.toLowerCase()}</td>
        {s.amounts.map((a, i) => <td key={i} className="px-3 py-1.5 text-right font-mono">{fmt(a)}</td>)}
        <td className="px-3 py-1.5 text-right font-mono text-amber-700">{Number(s.eliminations) ? `-${fmt(s.eliminations)}` : ""}</td>
        <td className="px-3 py-1.5 text-right font-mono">{fmt(s.total)}</td>
      </tr>
    </>
  );
}

function ProfitAndLoss({ id }: { id: string }) {
  const year = new Date().getFullYear();
  const [range, setRange] = useState({ from: `${year}-01-01`, to: todayIso() });
  const pl = useQuery({
    queryKey: ["group-pl", id, range],
    queryFn: async () => unwrap(await api.GET("/api/v1/groups/{id}/reports/profit-and-loss/", { params: { path: { id }, query: { from: range.from, to: range.to } } })),
  });
  const d = pl.data;
  return (
    <div className="space-y-4">
      <Card className="grid gap-3 p-4 sm:grid-cols-3 print:hidden">
        <Field label="From"><Input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} /></Field>
        <Field label="To"><Input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} /></Field>
      </Card>
      {pl.isLoading ? <Spinner /> : pl.error ? <ErrorState error={pl.error} /> : d && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4"><p className="text-xs uppercase text-stone-500">Group net profit</p><p className={`mt-1 font-mono text-xl font-semibold ${Number(d.net_profit) < 0 ? "text-red-700" : ""}`}>{fmt(d.net_profit)}</p></Card>
            <Card className="p-4"><p className="text-xs uppercase text-stone-500">Gross profit</p><p className="mt-1 font-mono text-xl font-semibold">{fmt(d.gross_profit)}</p></Card>
            <Card className="p-4"><p className="text-xs uppercase text-stone-500">Sales between companies taken out</p><p className="mt-1 font-mono text-xl font-semibold text-amber-700">{fmt(d.eliminated_income)}</p></Card>
          </div>
          <ConsolidatedTable companies={d.companies} sections={d.sections} csvName={`group-pl-${range.from}-${range.to}.csv`} />
          <Card className="overflow-x-auto">
            <Table head={["", ...d.companies.map((c) => c.name), "Group"]}>
              <tr className="font-semibold"><Td>Net profit</Td>{d.company_net_profit.map((n, i) => <Td key={i} className="text-right font-mono">{fmt(n)}</Td>)}<Td className="text-right font-mono">{fmt(d.net_profit)}</Td></tr>
            </Table>
          </Card>
          <p className="text-xs text-stone-500">Accounts are matched by code across the companies. Intercompany sales are taken out of both the seller&apos;s income and the buyer&apos;s costs, so the group&apos;s profit only counts business with the outside world.</p>
        </>
      )}
    </div>
  );
}

function BalanceSheet({ id }: { id: string }) {
  const [asOf, setAsOf] = useState(todayIso());
  const bs = useQuery({
    queryKey: ["group-bs", id, asOf],
    queryFn: async () => unwrap(await api.GET("/api/v1/groups/{id}/reports/balance-sheet/", { params: { path: { id }, query: { as_of: asOf } } })),
  });
  const d = bs.data;
  return (
    <div className="space-y-4">
      <Card className="grid gap-3 p-4 sm:grid-cols-3 print:hidden"><Field label="As at"><Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} /></Field></Card>
      {bs.isLoading ? <Spinner /> : bs.error ? <ErrorState error={bs.error} /> : d && (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {d.balanced ? <Badge tone="green">Balances</Badge> : <Badge tone="red">Doesn&apos;t balance</Badge>}
            {Number(d.intercompany_difference) !== 0 && (
              <span className="text-red-700">The companies disagree by {fmt(d.intercompany_difference)} on what they owe each other. Look for an intercompany entry recorded on one side only.</span>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4"><p className="text-xs uppercase text-stone-500">Total assets</p><p className="mt-1 font-mono text-xl font-semibold">{fmt(d.total_assets)}</p></Card>
            <Card className="p-4"><p className="text-xs uppercase text-stone-500">Total liabilities</p><p className="mt-1 font-mono text-xl font-semibold">{fmt(d.total_liabilities)}</p></Card>
            <Card className="p-4"><p className="text-xs uppercase text-stone-500">Equity</p><p className="mt-1 font-mono text-xl font-semibold">{fmt(d.total_equity)}</p></Card>
          </div>
          <ConsolidatedTable companies={d.companies} sections={d.groups} csvName={`group-balance-sheet-${asOf}.csv`} />
        </>
      )}
    </div>
  );
}

const KINDS: [string, string, string, string][] = [
  // kind, label, the `from` company, the `to` company
  ["sale", "Sale or recharge", "Seller", "Buyer"],
  ["loan", "Loan", "Lender", "Borrower"],
  ["settlement", "Settlement (paying what is owed)", "Paying company", "Company being paid"],
];

function Intercompany({ id, companies }: { id: string; companies: { slug: string; name: string }[] }) {
  const [adding, setAdding] = useState(false);
  const [voiding, setVoiding] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const list = useQuery({ queryKey: ["intercompany", id], queryFn: async () => unwrap(await api.GET("/api/v1/groups/{id}/intercompany/", { params: { path: { id } } })) });
  const balances = useQuery({ queryKey: ["intercompany-balances", id], queryFn: async () => unwrap(await api.GET("/api/v1/groups/{id}/intercompany/balances/", { params: { path: { id } } })) });
  const voidIt = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/groups/{id}/intercompany/{tx}/void/", { params: { path: { id, tx: voiding! } }, body: { reason } })),
    onSuccess: () => { toast.success("Voided in both companies"); setVoiding(null); setReason(""); },
  });
  const rows = list.data?.results ?? [];
  return (
    <div className="space-y-4">
      <Card>
        <div className="px-4 pt-3"><h2 className="text-sm font-semibold">Who owes whom</h2></div>
        {(balances.data ?? []).length === 0 ? <p className="px-4 py-3 text-sm text-stone-500">Nobody in the group owes anyone.</p> : (
          <Table head={["Company", "Owes", "Amount"]}>
            {balances.data!.map((b) => <tr key={`${b.owes}-${b.to}`}><Td>{b.owes}</Td><Td>{b.to}</Td><Td className="text-right font-mono">{fmt(b.amount)}</Td></tr>)}
          </Table>
        )}
      </Card>
      <Card>
        <div className="flex items-center justify-between px-4 pt-3">
          <h2 className="text-sm font-semibold">Transactions</h2>
          <Button variant="ghost" className="px-2 py-1" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Record</Button>
        </div>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : rows.length === 0 ? <EmptyState title="None yet">Record sales, recharges, loans and repayments between the companies here, so both sets of books agree.</EmptyState> : (
          <Table head={["Number", "Date", "What", "From", "To", "Amount", ""]}>
            {rows.map((t) => (
              <tr key={t.id} className={t.status === "void" ? "text-stone-400" : ""}>
                <Td className="font-mono text-xs">{t.number}</Td>
                <Td>{fmtDate(t.transaction_date)}</Td>
                <Td>{t.description}<div className="text-xs text-stone-500">{KINDS.find(([k]) => k === t.kind)?.[1]}{t.status === "void" ? ` · void: ${t.void_reason}` : ""}</div></Td>
                <Td>{t.from_company}<div className="text-xs text-stone-500">{t.from_account_name}</div></Td>
                <Td>{t.to_company}<div className="text-xs text-stone-500">{t.to_account_name}</div></Td>
                <Td className="text-right font-mono">{fmt(t.amount)}</Td>
                <Td>{t.status === "posted" && <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => { voidIt.reset(); setVoiding(t.id); }}>Void</button>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {adding && <RecordForm id={id} companies={companies} onClose={() => setAdding(false)} />}
      <Modal open={voiding !== null} title="Void this transaction" onClose={() => setVoiding(null)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); voidIt.mutate(); }}>
          <p className="text-sm text-stone-600">Both companies&apos; entries are removed (or reversed if their month is closed).</p>
          <Field label="Why?"><Input required value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <FormError error={voidIt.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setVoiding(null)}>Cancel</Button><Button type="submit" variant="danger" loading={voidIt.isPending}>Void</Button></div>
        </form>
      </Modal>
    </div>
  );
}

function RecordForm({ id, companies, onClose }: { id: string; companies: { slug: string; name: string }[]; onClose: () => void }) {
  const [form, setForm] = useState({
    kind: "sale", from_workspace: companies[0]?.slug ?? "", to_workspace: companies[1]?.slug ?? "", transaction_date: todayIso(),
    description: "", amount: "", from_account_id: "", to_account_id: "",
  });
  const fromAccounts = useAccounts(form.from_workspace);
  const toAccounts = useAccounts(form.to_workspace);
  const [, label, fromLabel, toLabel] = KINDS.find(([k]) => k === form.kind)!;
  const money = (a: { subtype?: string }) => a.subtype === "cash" || a.subtype === "bank";
  const fromList = (fromAccounts.data ?? []).filter((a) => (form.kind === "sale" ? a.account_type === "income" : money(a)));
  const toList = (toAccounts.data ?? []).filter((a) => (form.kind === "sale" ? (a.account_type === "expense" || a.account_type === "asset") && !money(a) : money(a)));
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/groups/{id}/intercompany/", { params: { path: { id } }, body: { ...form, kind: form.kind as never } })),
    onSuccess: (t) => { toast.success(`${t.number} posted in both companies`); onClose(); },
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value, ...(k === "kind" || k === "from_workspace" ? { from_account_id: "" } : {}), ...(k === "kind" || k === "to_workspace" ? { to_account_id: "" } : {}) }));
  return (
    <Modal size="lg" open title="Record an intercompany transaction" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Type"><Select value={form.kind} onChange={set("kind")}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
          <Field label="Date"><Input type="date" value={form.transaction_date} onChange={set("transaction_date")} /></Field>
          <Field label="Amount"><Input required inputMode="decimal" value={form.amount} onChange={set("amount")} /></Field>
        </div>
        <Field label="Description"><Input required value={form.description} onChange={set("description")} placeholder={form.kind === "sale" ? "Transport for May deliveries" : form.kind === "loan" ? "Loan for a truck deposit" : "Repayment"} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-3 rounded-md bg-stone-50 p-3">
            <Field label={fromLabel}><Select value={form.from_workspace} onChange={set("from_workspace")}>{companies.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></Field>
            <Field label={form.kind === "sale" ? "Its income account" : "Money leaves from"}>
              <Select required value={form.from_account_id} onChange={set("from_account_id")}><option value="">Choose</option><AccountOptions accounts={fromList} /></Select>
            </Field>
          </div>
          <div className="space-y-3 rounded-md bg-stone-50 p-3">
            <Field label={toLabel}><Select value={form.to_workspace} onChange={set("to_workspace")}>{companies.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></Field>
            <Field label={form.kind === "sale" ? "Its cost (expense) account" : "Money arrives in"}>
              <Select required value={form.to_account_id} onChange={set("to_account_id")}><option value="">Choose</option><AccountOptions accounts={toList} /></Select>
            </Field>
          </div>
        </div>
        <p className="text-xs text-stone-500">
          {label}: posted in both companies at once, through Due from group companies and Due to group companies.
          {form.kind === "sale" ? " No VAT is added; for a VAT-able sale, issue an invoice and send it through the Business inbox." : ""}
        </p>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Post in both</Button></div>
      </form>
    </Modal>
  );
}

function Companies({ id, isOwner, companies }: { id: string; isOwner: boolean; companies: { slug: string; name: string; kra_pin: string; currency: string }[] }) {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const mine = useQuery({ queryKey: ["workspaces"], queryFn: async () => unwrap(await api.GET("/api/v1/workspaces/")) });
  const add = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/groups/{id}/companies/", { params: { path: { id } }, body: { workspace: slug } })),
    onSuccess: () => { toast.success("Company added"); setSlug(""); },
  });
  const remove = useMutation({
    mutationFn: async (ws: string) => unwrap(await api.DELETE("/api/v1/groups/{id}/companies/{workspace}/", { params: { path: { id, workspace: ws } } })),
    onSuccess: () => toast.success("Company removed from the group"),
    onError: (e) => toast.error(e.message),
  });
  const deleteGroup = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/groups/{id}/", { params: { path: { id } } })),
    onSuccess: () => { toast.success("Group deleted"); router.replace("/groups"); },
    onError: (e) => toast.error(e.message),
  });
  const inGroup = new Set(companies.map((c) => c.slug));
  const addable = (mine.data?.results ?? []).filter((w) => !inGroup.has(w.slug));
  return (
    <div className="space-y-4">
      <Card>
        <Table head={["Company", "KRA PIN", "Currency", ""]}>
          {companies.map((c) => (
            <tr key={c.slug}>
              <Td><Link href={`/w/${c.slug}`} className="font-medium hover:underline">{c.name}</Link></Td>
              <Td className="font-mono text-xs">{c.kra_pin || "-"}</Td>
              <Td>{c.currency}</Td>
              <Td>{isOwner && <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => void ask(`Remove ${c.name} from the group?`).then((ok) => ok && remove.mutate(c.slug))}>Remove</button>}</Td>
            </tr>
          ))}
          {companies.length === 0 && <tr><Td colSpan={4} className="text-stone-500">No companies yet.</Td></tr>}
        </Table>
      </Card>
      {isOwner ? (
        <Card className="space-y-3 p-4">
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
            <div className="min-w-64 flex-1">
              <Field label="Add one of your workspaces" hint="You need to manage its settings. It must use the group's currency and not be in another group.">
                <Select required value={slug} onChange={(e) => setSlug(e.target.value)}><option value="">Choose</option>{addable.map((w) => <option key={w.slug} value={w.slug}>{w.name}</option>)}</Select>
              </Field>
            </div>
            <Button type="submit" loading={add.isPending}>Add</Button>
          </form>
          <FormError error={add.error} />
          <div className="border-t border-stone-100 pt-3">
            <Button variant="danger" loading={deleteGroup.isPending} onClick={() => void ask("Delete this group? The companies and their books stay as they are.").then((ok) => ok && deleteGroup.mutate())}>Delete group</Button>
          </div>
        </Card>
      ) : <p className="text-sm text-stone-500">Only the group&apos;s owner can add or remove companies.</p>}
    </div>
  );
}
