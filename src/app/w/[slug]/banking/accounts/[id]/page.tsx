"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { StatementImport } from "@/components/statement-import";
import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { AccountOptions, useAccounts } from "@/lib/api/accounting";
import { LINE_STATUS } from "@/lib/api/banking";
import { api, unwrap } from "@/lib/api/client";
import { useVatRates } from "@/lib/api/sales";
import type { BankStatementLine } from "@/lib/api/types";
import { fmt, fmtDate, todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function BankAccountPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<"statement" | "books">("statement");
  const [importing, setImporting] = useState(false);
  const [filter, setFilter] = useState("unmatched");
  const [working, setWorking] = useState<BankStatementLine | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [rec, setRec] = useState({ statement_date: todayIso(), statement_balance: "" });
  const account = useQuery({ queryKey: ["bank-account", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/bank-accounts/{id}/", { params: { path: { workspace: slug, id } } })) });
  const ledgerId = account.data?.ledger_account_id;
  const books = useQuery({
    queryKey: ["ledger", slug, ledgerId], enabled: Boolean(ledgerId) && tab === "books",
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/ledger-accounts/{id}/ledger/", { params: { path: { workspace: slug, id: ledgerId! } } })),
  });
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
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/banking`} className="text-sm text-stone-500 hover:underline">&larr; Cash and banking</Link>
      <PageHeader title={a.name} description={`Balance per the books ${fmt(a.balance)} · ledger ${a.ledger_code}${a.last_reconciled ? ` · reconciled to ${fmtDate(a.last_reconciled)}` : ""}`} guide="bank-reconciliation"
        actions={can("banking.reconcile") && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setImporting(true)}><Upload className="h-4 w-4" /> Import statement</Button>
            {open ? <Link href={`/w/${slug}/banking/reconciliations/${open.id}`}><Button>Continue reconciling</Button></Link> : <Button onClick={() => { start.reset(); setReconciling(true); }}>Reconcile</Button>}
          </div>
        )} />
      <div className="mb-4 flex gap-2">
        <Button variant={tab === "statement" ? "primary" : "secondary"} onClick={() => setTab("statement")}>Statement lines</Button>
        <Button variant={tab === "books" ? "primary" : "secondary"} onClick={() => setTab("books")}>Transactions in the books</Button>
      </div>
      {tab === "statement" ? (
        <>
          <div className="mb-3 w-52"><Select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="unmatched">To match</option><option value="matched">Matched</option><option value="excluded">Ignored</option><option value="">All</option></Select></div>
          <Card>
            {(lines.data?.results ?? []).length === 0 ? <EmptyState title={filter === "unmatched" ? "Nothing to match" : "No statement lines"}>Import your bank or M-Pesa statement (CSV) to match it against the books.</EmptyState> : (
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
      ) : (
        <Card>
          {books.isLoading ? <div className="px-4"><Spinner /></div> : (
            <Table head={["Date", "Description", "Reference", "Money in", "Money out", "Balance"]}>
              {(books.data?.lines ?? []).map((l, i) => (
                <tr key={i}><Td className="whitespace-nowrap">{fmtDate(l.entry_date)}</Td><Td>{l.description}</Td><Td className="font-mono text-xs">{l.reference}</Td>
                  <Td className="text-right font-mono">{Number(l.debit) ? fmt(l.debit) : ""}</Td><Td className="text-right font-mono">{Number(l.credit) ? fmt(l.credit) : ""}</Td><Td className="text-right font-mono">{fmt(l.balance)}</Td></tr>
              ))}
            </Table>
          )}
        </Card>
      )}
      {(recs.data?.results ?? []).length > 0 && (
        <div className="mt-6">
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
      <Modal open={reconciling} title={`Reconcile ${a.name}`} onClose={() => setReconciling(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start.mutate(); }}>
          <p className="text-sm text-stone-600">Take the closing balance and date from your bank or M-Pesa statement.</p>
          <div className="grid grid-cols-2 gap-3">
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

function MatchModal({ line, onClose }: { line: BankStatementLine; onClose: () => void }) {
  const { slug } = useWorkspace();
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
          <div className="flex gap-2">
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
              <div className="grid grid-cols-2 gap-3">
                <Field label="Account"><Select required value={record.account_id} onChange={(e) => setRecord((p) => ({ ...p, account_id: e.target.value }))}><option value="">Choose</option><AccountOptions accounts={chart} /></Select></Field>
                <Field label="VAT"><Select value={record.tax_rate_id} onChange={(e) => setRecord((p) => ({ ...p, tax_rate_id: e.target.value }))}><option value="">No VAT</option>{(rates.data?.results ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field>
              </div>
              <Field label="Description"><Input value={record.description} onChange={(e) => setRecord((p) => ({ ...p, description: e.target.value }))} /></Field>
              <div className="flex flex-wrap justify-between gap-2">
                <Button type="button" variant="ghost" onClick={() => act.mutate({ action: "exclude" })}>Ignore this line</Button>
                <Button type="submit" loading={act.isPending}>Record and match</Button>
              </div>
            </form>
          </>
        )}
        <FormError error={act.error} />
      </div>
    </Modal>
  );
}
