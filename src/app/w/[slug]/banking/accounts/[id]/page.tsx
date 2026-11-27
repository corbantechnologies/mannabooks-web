"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Download, FileDown, Printer, Upload } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { downloadTemplate, StatementImport } from "@/components/statement-import";
import { OWNER_KINDS, useOwners } from "@/lib/api/owners";
import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { MinBalance } from "@/components/min-balance";
import { AccountOptions, useAccounts } from "@/lib/api/accounting";
import { LINE_STATUS, useBankAccounts } from "@/lib/api/banking";
import { api, unwrap } from "@/lib/api/client";
import { useVatRates } from "@/lib/api/sales";
import type { components } from "@/lib/api/schema";
import type { BankStatementLine } from "@/lib/api/types";
import { downloadCsv, fmt, fmtDate, todayIso } from "@/lib/format";
import { kindLabel, sourceLink } from "@/lib/source-links";
import { useWorkspace, wsPath } from "@/lib/workspace";

type Tx = components["schemas"]["TransactionRow"];
type Filters = { from: string; to: string; direction: "" | "in" | "out"; kind: string; q: string };

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
function preset(name: string): [string, string] {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  if (name === "this_month") return [iso(new Date(y, m, 1)), iso(new Date(y, m + 1, 0))];
  if (name === "last_month") return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))];
  if (name === "3_months") return [iso(new Date(y, m - 2, 1)), iso(new Date(y, m + 1, 0))];
  if (name === "this_year") return [iso(new Date(y, 0, 1)), iso(new Date(y, 11, 31))];
  return ["", ""];
}

export default function BankAccountPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<"books" | "statement">("books");
  const [importing, setImporting] = useState(false);
  const [filter, setFilter] = useState("unmatched");
  const [working, setWorking] = useState<BankStatementLine | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [recording, setRecording] = useState<"in" | "out" | "transfer" | null>(null);
  const [rec, setRec] = useState({ statement_date: todayIso(), statement_balance: "" });
  const account = useQuery({ queryKey: ["bank-account", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/bank-accounts/{id}/", { params: { path: { workspace: slug, id } } })) });
  const lines = useQuery({
    queryKey: ["statement-lines", slug, id, filter],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/statement-lines/", { params: { path: { workspace: slug }, query: { bank_account: id, status: (filter || undefined) as never, page_size: 200 } } })),
  });
  const recs = useQuery({
    queryKey: ["reconciliations", slug, id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/reconciliations/", { params: { path: { workspace: slug }, query: { bank_account: id } } })),
  });
  const start = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/reconciliations/", { ...wsPath(slug), body: { bank_account_id: id, ...rec } })),
    onSuccess: (r) => router.push(`/w/${slug}/banking/reconciliations/${r.id}`),
  });
  if (account.isLoading) return <Spinner />;
  if (account.error) return <ErrorState error={account.error} />;
  const a = account.data!;
  const open = (recs.data?.results ?? []).find((r) => r.status === "in_progress");
  const toMatch = Number(a.unmatched_lines ?? 0);
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/banking`} className="text-sm text-stone-500 hover:underline print:hidden">&larr; Cash and banking</Link>
      <PageHeader title={a.name} description={`Ledger ${a.ledger_code}${a.last_reconciled ? ` · reconciled to ${fmtDate(a.last_reconciled)}` : " · not reconciled yet"}`} guide="bank-reconciliation"
        actions={(
          <div className="flex flex-wrap gap-2 print:hidden">
            {can("banking.receive") && <Button variant="secondary" onClick={() => setRecording("in")}><ArrowDownLeft className="h-4 w-4" /> Money in</Button>}
            {can("banking.spend") && <Button variant="secondary" onClick={() => setRecording("out")}><ArrowUpRight className="h-4 w-4" /> Money out</Button>}
            {can("banking.transfer") && <Button variant="secondary" onClick={() => setRecording("transfer")}><ArrowLeftRight className="h-4 w-4" /> Transfer</Button>}
            {can("banking.reconcile") && <Button variant="secondary" onClick={() => setImporting(true)}><Upload className="h-4 w-4" /> Import statement</Button>}
            {can("banking.reconcile") && (open
              ? <Link href={`/w/${slug}/banking/reconciliations/${open.id}`}><Button>Continue reconciling</Button></Link>
              : <Button onClick={() => { start.reset(); setReconciling(true); }}>Reconcile</Button>)}
          </div>
        )} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4"><p className="text-xs uppercase tracking-wide text-stone-500">Balance in the books</p><p className="mt-1 break-words text-xl font-semibold tabular-nums sm:text-2xl">{fmt(a.balance)}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-wide text-stone-500">Last reconciled</p><p className="mt-1 text-xl font-semibold sm:text-2xl">{a.last_reconciled ? fmtDate(a.last_reconciled) : "Never"}</p></Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-stone-500">Statement lines to match</p>
          <p className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">{toMatch}</p>
          {toMatch > 0 && <button type="button" className="mt-1 text-xs font-medium text-brand-700 hover:underline print:hidden" onClick={() => { setTab("statement"); setFilter("unmatched"); }}>Match them</button>}
        </Card>
        <div className="print:hidden"><MinBalance id={a.id} value={a.min_balance} below={!!a.below_minimum} canEdit={can("banking.reconcile") || can("banking.spend")} /></div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <Button variant={tab === "books" ? "primary" : "secondary"} onClick={() => setTab("books")}>Transactions in the books</Button>
        <Button variant={tab === "statement" ? "primary" : "secondary"} onClick={() => setTab("statement")}>Statement lines{toMatch ? ` (${toMatch} to match)` : ""}</Button>
      </div>
      {tab === "books" ? <Books accountId={id} accountName={a.name} /> : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3 print:hidden">
            <div className="w-52"><Select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="unmatched">To match</option><option value="matched">Matched</option><option value="excluded">Ignored</option><option value="">All</option></Select></div>
            <button type="button" className="text-sm text-brand-700 hover:underline" onClick={() => downloadTemplate()}><FileDown className="mr-1 inline h-4 w-4" />Statement template (CSV)</button>
          </div>
          <Card>
            {(lines.data?.results ?? []).length === 0 ? <EmptyState title={filter === "unmatched" ? "Nothing to match" : "No statement lines"}>Import your bank or M-Pesa statement (CSV, or our template) to match it against the books.</EmptyState> : (
              <Table head={["Date", "Description", "Reference", "Money in", "Money out", "Status", ""]}>
                {lines.data!.results.map((l) => (
                  <tr key={l.id}>
                    <Td className="whitespace-nowrap">{fmtDate(l.line_date)}</Td>
                    <Td>{l.description}{l.matched_to && <div className="text-xs text-stone-500">{(l.matched_to as { description?: string }).description}</div>}</Td>
                    <Td className="font-mono text-xs">{l.reference}</Td>
                    <Td className="text-right font-mono">{Number(l.amount) > 0 ? fmt(l.amount) : ""}</Td>
                    <Td className="text-right font-mono">{Number(l.amount) < 0 ? fmt(-Number(l.amount)) : ""}</Td>
                    <Td><Badge tone={LINE_STATUS[l.status ?? "unmatched"].tone}>{LINE_STATUS[l.status ?? "unmatched"].label}</Badge></Td>
                    <Td>{can("banking.reconcile") && <Button variant="ghost" className="px-2 py-1" onClick={() => setWorking(l)}>{l.status === "unmatched" ? "Match" : "Change"}</Button>}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </>
      )}
      {(recs.data?.results ?? []).length > 0 && (
        <div className="mt-6 print:hidden">
          <h2 className="mb-2 text-sm font-semibold">Reconciliations</h2>
          <Card>
            <Table head={["Statement date", "Statement balance", "Status", ""]}>
              {recs.data!.results.map((r) => (
                <tr key={r.id}><Td>{fmtDate(r.statement_date)}</Td><Td className="text-right font-mono">{fmt(r.statement_balance)}</Td>
                  <Td><Badge tone={r.status === "completed" ? "green" : "amber"}>{r.status === "completed" ? "Completed" : "In progress"}</Badge></Td>
                  <Td><Link className="text-sm text-brand-700 hover:underline" href={`/w/${slug}/banking/reconciliations/${r.id}`}>Open</Link></Td></tr>
              ))}
            </Table>
          </Card>
        </div>
      )}
      {importing && <StatementImport bankAccountId={id} onClose={() => setImporting(false)} />}
      {working && <MatchModal line={working} onClose={() => setWorking(null)} />}
      {(recording === "in" || recording === "out") && <MoneyModal accountId={id} accountName={a.name} direction={recording} onClose={() => setRecording(null)} />}
      {recording === "transfer" && <TransferModal accountId={id} accountName={a.name} onClose={() => setRecording(null)} />}
      <Modal open={reconciling} title={`Reconcile ${a.name}`} onClose={() => setReconciling(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start.mutate(); }}>
          <div className="rounded-md bg-stone-50 p-3 text-sm text-stone-700">
            <p className="font-medium">What reconciling does</p>
            <p className="mt-1">It proves the books agree with the bank. You enter the closing balance on your statement; MannaBooks lists every transaction in the books up to that date and you tick the ones the bank shows (lines you matched are ticked already). When the ticked ones add up to the statement balance, the difference is zero and you complete it: those transactions are locked, so nobody changes a month the bank has confirmed.</p>
            <p className="mt-1">Something on the statement but not in the books (bank charges, interest)? Record it first with Money in or Money out, or import the statement and match each line.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Statement date"><Input type="date" required value={rec.statement_date} onChange={(e) => setRec((p) => ({ ...p, statement_date: e.target.value }))} /></Field>
            <Field label="Closing balance on the statement"><Input required inputMode="decimal" value={rec.statement_balance} onChange={(e) => setRec((p) => ({ ...p, statement_balance: e.target.value }))} /></Field>
          </div>
          <FormError error={start.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setReconciling(false)}>Cancel</Button><Button type="submit" loading={start.isPending}>Start</Button></div>
        </form>
      </Modal>
    </div>
  );
}

/** The account's transactions in the books: newest first, filtered, each one opens to show what it was. */
function Books({ accountId, accountName }: { accountId: string; accountName: string }) {
  const { slug } = useWorkspace();
  const [f, setF] = useState<Filters>(() => { const [from, to] = preset("3_months"); return { from, to, direction: "", kind: "", q: "" }; });
  const [range, setRange] = useState("3_months");
  const [shown, setShown] = useState<Tx | null>(null);
  const data = useQuery({
    queryKey: ["bank-transactions", slug, accountId, f],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/bank-accounts/{id}/transactions/", {
      params: { path: { workspace: slug, id: accountId }, query: { from: f.from || undefined, to: f.to || undefined, direction: f.direction || undefined, kind: f.kind || undefined, q: f.q || undefined } },
    })),
  });
  const d = data.data;
  const rows = d?.rows ?? [];
  const filtered = Boolean(f.direction || f.kind || f.q);
  const pickRange = (name: string) => { setRange(name); if (name !== "custom") { const [from, to] = preset(name); setF((p) => ({ ...p, from, to })); } };
  const period = `${f.from ? fmtDate(f.from) : "the start"} to ${f.to ? fmtDate(f.to) : "today"}`;
  function exportCsv() {
    downloadCsv(`${accountName} ${f.from || "start"} to ${f.to || todayIso()}.csv`, [
      ["Date", "Description", "Reference", "Money in", "Money out", "Balance", "Type", "Entry", "Other side"],
      ...(filtered ? [] : [[f.from || "", "Opening balance", "", "", "", d?.opening ?? "0", "", "", ""]]),
      ...[...rows].reverse().map((r) => [r.date, r.description, r.reference, r.money_in ?? "", r.money_out ?? "", r.balance, kindLabel(r.kind), r.number,
        r.other_side.map((o) => o.account_name).join("; ")]),
    ]);
  }
  return (
    <>
      <Card className="mb-3 p-3 print:hidden">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Dates">
            <Select value={range} onChange={(e) => pickRange(e.target.value)}>
              <option value="this_month">This month</option><option value="last_month">Last month</option><option value="3_months">Last 3 months</option>
              <option value="this_year">This year</option><option value="all">Everything</option><option value="custom">Choose dates</option>
            </Select>
          </Field>
          <Field label="From"><Input type="date" value={f.from} onChange={(e) => { setRange("custom"); setF((p) => ({ ...p, from: e.target.value })); }} /></Field>
          <Field label="To"><Input type="date" value={f.to} onChange={(e) => { setRange("custom"); setF((p) => ({ ...p, to: e.target.value })); }} /></Field>
          <Field label="In or out">
            <Select value={f.direction} onChange={(e) => setF((p) => ({ ...p, direction: e.target.value as Filters["direction"] }))}><option value="">Both</option><option value="in">Money in</option><option value="out">Money out</option></Select>
          </Field>
          <Field label="Type">
            <Select value={f.kind} onChange={(e) => setF((p) => ({ ...p, kind: e.target.value }))}>
              <option value="">Every type</option>
              {(d?.kinds ?? []).map((k) => <option key={k} value={k}>{kindLabel(k)}</option>)}
            </Select>
          </Field>
          <Field label="Search"><Input placeholder="Description, reference, number" value={f.q} onChange={(e) => setF((p) => ({ ...p, q: e.target.value }))} /></Field>
        </div>
      </Card>
      <div className="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4"><p className="text-xs uppercase tracking-wide text-stone-500">Opening {f.from ? fmtDate(f.from) : ""}</p><p className="mt-1 break-words text-xl font-semibold tabular-nums">{fmt(d?.opening)}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-wide text-stone-500">Money in{filtered ? " (shown)" : ""}</p><p className="mt-1 break-words text-xl font-semibold tabular-nums text-emerald-700">{fmt(filtered ? d?.shown_in : d?.money_in)}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-wide text-stone-500">Money out{filtered ? " (shown)" : ""}</p><p className="mt-1 break-words text-xl font-semibold tabular-nums text-red-700">{fmt(filtered ? d?.shown_out : d?.money_out)}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-wide text-stone-500">Closing {f.to ? fmtDate(f.to) : ""}</p><p className="mt-1 break-words text-xl font-semibold tabular-nums">{fmt(d?.closing)}</p></Card>
      </div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-600"><span className="hidden print:inline">{accountName}: </span>{rows.length} transaction(s), {period}, newest first{d?.truncated ? ". Only the first 2,000: narrow the dates" : ""}.</p>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="secondary" disabled={!rows.length} onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
          <Button variant="secondary" disabled={!rows.length} onClick={() => window.print()}><Printer className="h-4 w-4" /> Print or PDF</Button>
        </div>
      </div>
      <Card>
        {data.isLoading ? <div className="px-4"><Spinner /></div> : data.error ? <div className="p-4"><ErrorState error={data.error} /></div> : rows.length === 0 ? (
          <EmptyState title="No transactions">{filtered ? "Nothing matches these filters." : "Nothing was recorded in this account in these dates."}</EmptyState>
        ) : (
          <Table head={["Date", "Description", "Type", "Reference", "Money in", "Money out", "Balance"]}>
            {rows.map((r) => (
              <tr key={r.line_id} className="cursor-pointer hover:bg-stone-50" onClick={() => setShown(r)}>
                <Td className="whitespace-nowrap">{fmtDate(r.date)}</Td>
                <Td>{r.description || "-"}{r.other_side.length > 0 && <div className="text-xs text-stone-500">{r.other_side.map((o) => o.account_name).slice(0, 3).join(", ")}</div>}</Td>
                <Td className="whitespace-nowrap text-xs text-stone-600">{kindLabel(r.kind)}</Td>
                <Td className="font-mono text-xs">{r.reference || r.number}</Td>
                <Td className="text-right font-mono text-emerald-700">{r.money_in ? fmt(r.money_in) : ""}</Td>
                <Td className="text-right font-mono text-red-700">{r.money_out ? fmt(r.money_out) : ""}</Td>
                <Td className="text-right font-mono">{fmt(r.balance)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {shown && <TransactionModal tx={shown} onClose={() => setShown(null)} />}
    </>
  );
}

function TransactionModal({ tx, onClose }: { tx: Tx; onClose: () => void }) {
  const { slug } = useWorkspace();
  const doc = sourceLink(slug, tx);
  const amount = tx.money_in ?? tx.money_out;
  return (
    <Modal open title={`${tx.money_in ? "Money in" : "Money out"} ${fmt(amount)}`} onClose={onClose}>
      <div className="space-y-4 text-sm">
        <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5">
          <dt className="text-stone-500">Date</dt><dd>{fmtDate(tx.date)}</dd>
          <dt className="text-stone-500">Description</dt><dd>{tx.description || "-"}</dd>
          <dt className="text-stone-500">Type</dt><dd>{kindLabel(tx.kind)}</dd>
          <dt className="text-stone-500">Reference</dt><dd className="font-mono text-xs">{tx.reference || "-"}</dd>
          <dt className="text-stone-500">Journal entry</dt><dd className="font-mono text-xs">{tx.number}</dd>
          <dt className="text-stone-500">Balance after</dt><dd className="font-mono">{fmt(tx.balance)}</dd>
        </dl>
        <div>
          <h3 className="mb-1 font-semibold">{tx.money_in ? "Where it came from" : "Where it went"}</h3>
          <div className="rounded border border-stone-200">
            {tx.other_side.map((o, i) => (
              <div key={i} className="flex justify-between gap-3 border-b border-stone-100 px-3 py-2 last:border-0">
                <span>{o.account_code} {o.account_name}{o.description && <span className="block text-xs text-stone-500">{o.description}</span>}</span>
                <span className="whitespace-nowrap font-mono">{fmt(Number(o.debit) || Number(o.credit))} {Number(o.debit) ? "Dr" : "Cr"}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Link href={`/w/${slug}/accounting/journals/${tx.entry_id}`}><Button variant="secondary">Journal entry</Button></Link>
          {doc && <Link href={doc.href}><Button>Open the {doc.label.toLowerCase()}</Button></Link>}
        </div>
      </div>
    </Modal>
  );
}

/** Quick money in (other income) or money out (an expense) for this account. Supplier, VAT and several lines: the full form. */
function MoneyModal({ accountId, accountName, direction, onClose }: { accountId: string; accountName: string; direction: "in" | "out"; onClose: () => void }) {
  const { slug } = useWorkspace();
  const accounts = useAccounts(slug);
  const out = direction === "out";
  const [form, setForm] = useState({ date: todayIso(), amount: "", account_id: "", party: "", reference: "", description: "" });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const chart = (accounts.data ?? []).filter((x) => x.is_active && (out ? x.account_type === "expense" : x.account_type === "income"));
  const save = useMutation({
    mutationFn: async () => out
      ? unwrap(await api.POST("/api/v1/w/{workspace}/expenses/", { ...wsPath(slug), body: {
        expense_date: form.date, paid_from_id: accountId, payee: form.party, reference: form.reference,
        lines: [{ description: form.description || form.party, quantity: "1", unit_cost: form.amount, account_id: form.account_id, tax_rate_id: null }],
      } as never }))
      : unwrap(await api.POST("/api/v1/w/{workspace}/other-income/", { ...wsPath(slug), body: {
        income_date: form.date, received_into_id: accountId, payer: form.party, reference: form.reference,
        lines: [{ description: form.description || form.party, amount: form.amount, account_id: form.account_id || null, tax_rate_id: null }],
      } as never })),
    onSuccess: (r) => { toast.success(`${(r as { number?: string }).number ?? "Saved"}: ${out ? "money out" : "money in"} recorded`); onClose(); },
  });
  return (
    <Modal open title={`${out ? "Money out of" : "Money into"} ${accountName}`} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date"><Input type="date" required value={form.date} onChange={set("date")} /></Field>
          <Field label="Amount"><Input required inputMode="decimal" value={form.amount} onChange={set("amount")} /></Field>
          <Field label={out ? "What it was for" : "What it was"}>
            <Select required={out} value={form.account_id} onChange={set("account_id")}><option value="">{out ? "Choose" : "Other income"}</option><AccountOptions accounts={chart} /></Select>
          </Field>
          <Field label={out ? "Paid to" : "Received from"}><Input value={form.party} onChange={set("party")} /></Field>
          <Field label="Reference"><Input placeholder="Bank or M-Pesa reference" value={form.reference} onChange={set("reference")} /></Field>
          <Field label="Description"><Input value={form.description} onChange={set("description")} /></Field>
        </div>
        <p className="text-xs text-stone-500">No VAT. A supplier, VAT or several lines? Use the <Link className="text-brand-700 hover:underline" href={`/w/${slug}/banking/${out ? "expenses" : "income"}/new`}>full form</Link>. Paying a bill or receiving from a customer? Record it on the bill or invoice, so it&apos;s settled.</p>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
      </form>
    </Modal>
  );
}

function TransferModal({ accountId, accountName, onClose }: { accountId: string; accountName: string; onClose: () => void }) {
  const { slug } = useWorkspace();
  const all = useBankAccounts(slug);
  const others = (all.data?.results ?? []).filter((x) => x.is_active && x.id !== accountId);
  const [form, setForm] = useState({ way: "out", other: "", transfer_date: todayIso(), amount: "", fee: "", reference: "" });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/bank-transfers/", { ...wsPath(slug), body: {
      from_account_id: form.way === "out" ? accountId : form.other, to_account_id: form.way === "out" ? form.other : accountId,
      transfer_date: form.transfer_date, amount: form.amount, fee: form.fee || "0", reference: form.reference,
    } as never })),
    onSuccess: (t) => { toast.success(`${t.number} saved`); onClose(); },
  });
  return (
    <Modal open title={`Transfer: ${accountName}`} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Which way"><Select value={form.way} onChange={set("way")}><option value="out">From this account to</option><option value="in">Into this account from</option></Select></Field>
          <Field label="The other account">
            <Select required value={form.other} onChange={set("other")}><option value="">Choose</option>{others.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>
          </Field>
          <Field label="Date"><Input type="date" required value={form.transfer_date} onChange={set("transfer_date")} /></Field>
          <Field label="Amount"><Input required inputMode="decimal" value={form.amount} onChange={set("amount")} /></Field>
          <Field label="Fee" hint="Charged on the account it leaves"><Input inputMode="decimal" value={form.fee} onChange={set("fee")} /></Field>
          <Field label="Reference"><Input value={form.reference} onChange={set("reference")} /></Field>
        </div>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
      </form>
    </Modal>
  );
}

function MatchModal({ line, onClose }: { line: BankStatementLine; onClose: () => void }) {
  const { slug, can } = useWorkspace();
  const accounts = useAccounts(slug);
  const rates = useVatRates(slug);
  const out = Number(line.amount) < 0;
  const [record, setRecord] = useState({ account_id: "", tax_rate_id: "", description: line.description });
  const suggestions = useQuery({
    queryKey: ["statement-suggestions", slug, line.id], enabled: line.status === "unmatched",
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/statement-lines/{id}/suggestions/", { params: { path: { workspace: slug, id: line.id } } })),
  });
  const act = useMutation({
    mutationFn: async (body: Record<string, unknown>) => unwrap(await api.POST("/api/v1/w/{workspace}/statement-lines/{id}/action/", { params: { path: { workspace: slug, id: line.id } }, body: body as never })),
    onSuccess: (l) => { toast.success(LINE_STATUS[l.status ?? "unmatched"].label); onClose(); },
  });
  const chart = (accounts.data ?? []).filter((a) => a.is_active && (out ? a.account_type === "expense" : a.account_type === "income"));
  return (
    <Modal open title={`${fmtDate(line.line_date)} · ${out ? "Money out" : "Money in"} ${fmt(Math.abs(Number(line.amount)))}`} onClose={onClose}>
      <div className="space-y-5">
        <p className="text-sm text-stone-700">{line.description} <span className="font-mono text-xs text-stone-500">{line.reference}</span></p>
        {line.status !== "unmatched" ? (
          <div className="flex flex-wrap gap-2">
            {line.status === "matched" && <Button variant="secondary" loading={act.isPending} onClick={() => act.mutate({ action: "unmatch" })}>Unmatch</Button>}
            {line.status === "excluded" && <Button variant="secondary" loading={act.isPending} onClick={() => act.mutate({ action: "include" })}>Stop ignoring</Button>}
          </div>
        ) : (
          <>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Already in the books?</h3>
              {(suggestions.data ?? []).length === 0 ? <p className="text-sm text-stone-500">No transaction with this amount within 10 days.</p> : (
                <div className="space-y-1">
                  {suggestions.data!.map((s) => (
                    <button key={s.journal_line_id} className="flex w-full items-center justify-between rounded border border-stone-200 px-3 py-2 text-left text-sm hover:border-brand-600"
                      onClick={() => act.mutate({ action: "match", journal_line_id: s.journal_line_id })}>
                      <span>{fmtDate(s.date)} · {s.description} <span className="font-mono text-xs text-stone-500">{s.reference}</span></span>
                      <span className="font-medium text-brand-700">Match</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <form className="space-y-3 border-t border-stone-200 pt-4" onSubmit={(e) => { e.preventDefault(); act.mutate({ action: "record", account_id: record.account_id, tax_rate_id: record.tax_rate_id || null, description: record.description }); }}>
              <h3 className="text-sm font-semibold">Not in the books: record it as {out ? "an expense" : "other income"}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Account"><Select required value={record.account_id} onChange={(e) => setRecord((p) => ({ ...p, account_id: e.target.value }))}><option value="">Choose</option><AccountOptions accounts={chart} /></Select></Field>
                <Field label="VAT"><Select value={record.tax_rate_id} onChange={(e) => setRecord((p) => ({ ...p, tax_rate_id: e.target.value }))}><option value="">No VAT</option>{(rates.data?.results ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field>
              </div>
              <Field label="Description"><Input value={record.description} onChange={(e) => setRecord((p) => ({ ...p, description: e.target.value }))} /></Field>
              <div className="flex flex-wrap justify-between gap-2">
                <Button type="button" variant="ghost" onClick={() => act.mutate({ action: "exclude" })}>Ignore this line</Button>
                <Button type="submit" loading={act.isPending}>Record and match</Button>
              </div>
            </form>
            {can("owners.record") && <OwnerMoney out={out} onRecord={(body) => act.mutate({ action: "owner", description: record.description, ...body })} saving={act.isPending} />}
          </>
        )}
        <FormError error={act.error} />
      </div>
    </Modal>
  );
}

/** A deposit from a director, a loan repaid to one, drawings...: owners' money, not income or an expense. */
function OwnerMoney({ out, saving, onRecord }: { out: boolean; saving: boolean; onRecord: (body: Record<string, unknown>) => void }) {
  const { slug } = useWorkspace();
  const owners = useOwners(slug);
  const kinds = OWNER_KINDS.filter((k) => k.in === !out);
  const [form, setForm] = useState({ owner_id: "", owner_kind: kinds[0].value as string, share_premium: "" });
  const kind = kinds.find((k) => k.value === form.owner_kind);
  return (
    <form className="space-y-3 border-t border-stone-200 pt-4" onSubmit={(e) => { e.preventDefault(); onRecord({ ...form, share_premium: form.share_premium || 0 }); }}>
      <h3 className="text-sm font-semibold">Or: money {out ? "to" : "from"} an owner or director</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Who">
          <Select required value={form.owner_id} onChange={(e) => setForm((p) => ({ ...p, owner_id: e.target.value }))}>
            <option value="">Choose</option>
            {(owners.data?.results ?? []).filter((o) => o.is_active).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        </Field>
        <Field label="What it was" hint={kind?.hint}>
          <Select value={form.owner_kind} onChange={(e) => setForm((p) => ({ ...p, owner_kind: e.target.value }))}>{kinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</Select>
        </Field>
        {form.owner_kind === "shares" && <Field label="Share premium" hint="The part paid above the shares' face value, if any."><Input inputMode="decimal" value={form.share_premium} onChange={(e) => setForm((p) => ({ ...p, share_premium: e.target.value }))} /></Field>}
      </div>
      {(owners.data?.results ?? []).length === 0 && <p className="text-xs text-stone-500">Add your owners and directors under Cash and banking &gt; Owners and directors first.</p>}
      <div className="flex justify-end"><Button type="submit" variant="secondary" loading={saving}>Record and match</Button></div>
    </form>
  );
}
