"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, PasswordInput, Select, Spinner, Table, Td } from "@/components/ui";
import { AccountOptions, useAccounts } from "@/lib/api/accounting";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { useBankAccounts } from "@/lib/api/banking";
import { useDepositAccounts } from "@/lib/api/sales";
import type { components } from "@/lib/api/schema";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

type CardConnection = components["schemas"]["CardConnection"];
type CardPayout = components["schemas"]["CardPayout"];

const STATUS: Record<string, { label: string; tone: "green" | "amber" | "red" | "stone" }> = {
  success: { label: "Paid", tone: "green" }, pending: { label: "Waiting", tone: "amber" }, failed: { label: "Failed", tone: "red" }, abandoned: { label: "Not completed", tone: "stone" },
};

export default function CardPaymentsPage() {
  const { slug, can } = useWorkspace();
  const conn = useQuery({ queryKey: ["card-connection", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/cards/connection/", wsPath(slug))) });
  return (
    <div className="space-y-6">
      <PageHeader title="Card payments (Paystack)" guide="card-payments"
        description="Let customers pay their invoices by card from the link you send them. Payments are recorded against the invoice by themselves." />
      <div className="rounded-md border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
        You need your own Paystack account (paystack.com), approved for live payments. Paystack pays the money to your bank, less its fee; MannaBooks never holds it.
        Until it is paid out, card money waits in <span className="font-medium">Card payments in transit</span>, and the fee is recorded as a bank charge.
        Every morning MannaBooks fetches Paystack&apos;s payouts and checks each one against these payments, ready for you to record in the bank.
      </div>
      {conn.isLoading ? <Spinner /> : conn.error ? <ErrorState error={conn.error} /> : <ConnectionForm conn={conn.data!} />}
      {can("cardpayments.view") && <Payouts />}
      {can("cardpayments.view") && <RecentPayments />}
    </div>
  );
}

function ConnectionForm({ conn }: { conn: CardConnection }) {
  const { slug, can } = useWorkspace();
  const qc = useQueryClient();
  const manage = can("cardpayments.manage");
  const deposits = useDepositAccounts(slug);
  const banks = useBankAccounts(slug);
  const [form, setForm] = useState({
    public_key: conn.public_key ?? "", secret_key: "", deposit_account_id: conn.deposit_account_id ?? "", payout_account_id: conn.payout_account_id ?? "",
    auto_record_payouts: conn.auto_record_payouts ?? false, is_active: conn.is_active ?? false,
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["card-connection", slug] });
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PUT("/api/v1/w/{workspace}/cards/connection/", {
      ...wsPath(slug), body: { provider: "paystack", ...form, deposit_account_id: form.deposit_account_id || null, payout_account_id: form.payout_account_id || null },
    })),
    onSuccess: () => { toast.success("Card payment settings saved"); setForm((p) => ({ ...p, secret_key: "" })); refresh(); void qc.invalidateQueries({ queryKey: ["card-payouts", slug] }); },
  });
  const test = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/cards/connection/test/", wsPath(slug))),
    onSuccess: () => { toast.success("Paystack accepted your key"); refresh(); },
    onError: (e) => toast.error(e.message),
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p) => ({ ...p, [key]: e.target.value }));
  return (
    <Card className="p-5">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto font-semibold">Your Paystack account</h2>
          {conn.has_secret_key && <Badge tone={conn.is_test ? "amber" : "green"}>{conn.is_test ? "Test keys" : "Live keys"}</Badge>}
          {conn.verified_at && <Badge tone="green">Key checked {fmtDate(conn.verified_at)}</Badge>}
          {conn.last_error && <Badge tone="red">{conn.last_error}</Badge>}
        </div>
        <fieldset disabled={!manage} className="grid gap-3 sm:grid-cols-2">
          <Field label="Public key" hint="On Paystack: Settings > API Keys and Webhooks. Starts with pk_test_ or pk_live_." error={fieldError(save.error, "public_key")}>
            <Input autoComplete="off" value={form.public_key} onChange={set("public_key")} placeholder="pk_live_..." />
          </Field>
          <Field label="Secret key" hint={conn.has_secret_key ? "Saved. Enter a new one only to replace it." : "Starts with sk_test_ or sk_live_. Stored encrypted."} error={fieldError(save.error, "secret_key")}>
            <PasswordInput autoComplete="off" value={form.secret_key} onChange={set("secret_key")} />
          </Field>
          <Field label="Card money waits in" hint="Blank: Card payments in transit, until Paystack pays it to your bank." error={fieldError(save.error, "deposit_account_id")}>
            <Select value={form.deposit_account_id} onChange={set("deposit_account_id")}>
              <option value="">Card payments in transit</option>
              {deposits.data.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
            </Select>
          </Field>
          <Field label="Paystack pays out to" hint="The bank account on your Paystack payout settings. Payouts are recorded into it by themselves." error={fieldError(save.error, "payout_account_id")}>
            <Select value={form.payout_account_id} onChange={set("payout_account_id")}>
              <option value="">Choose the bank</option>
              {(banks.data?.results ?? []).filter((b) => b.is_active !== false && b.id !== conn.transit_bank_account_id).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
        </fieldset>
        {conn.webhook_url && (
          <div className="rounded-md bg-stone-50 p-3 text-sm">
            <p className="font-medium text-stone-900">Webhook URL</p>
            <p className="mt-0.5 text-stone-600">Paste this on Paystack under Settings &gt; API Keys and Webhooks, so payments are recorded even if the customer closes the page.</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded border border-stone-200 bg-white px-2 py-1 text-xs">{conn.webhook_url}</code>
              <Button type="button" variant="secondary" onClick={() => void navigator.clipboard.writeText(conn.webhook_url!).then(() => toast.success("Copied"))}><Copy className="h-4 w-4" /> Copy</Button>
            </div>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled={!manage} checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} />
          Show &quot;Pay by card&quot; on the links customers open
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" disabled={!manage} checked={form.auto_record_payouts} onChange={(e) => setForm((p) => ({ ...p, auto_record_payouts: e.target.checked }))} />
          <span>
            Record payouts in the bank by themselves when they match
            <span className="block text-xs text-stone-500">Only a payout whose payments all came through MannaBooks and add up to the cent. Anything else, such as a refund Paystack kept back, waits for you. Off: you record each payout after checking it.</span>
          </span>
        </label>
        <FormError error={save.error} />
        {manage && (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={save.isPending}>Save</Button>
            <Button type="button" variant="secondary" disabled={!conn.has_secret_key} loading={test.isPending} onClick={() => test.mutate()}>Check key with Paystack</Button>
          </div>
        )}
      </form>
    </Card>
  );
}

const PAYOUT_TONE: Record<string, "green" | "amber" | "red"> = { success: "green", pending: "amber", processing: "amber", failed: "red" };

/** Paystack's payouts to the bank: recorded by themselves when every payment in them came through MannaBooks. */
function Payouts() {
  const { slug, can } = useWorkspace();
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["card-payouts", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/cards/payouts/", { params: { path: { workspace: slug }, query: { page_size: 30 } as never } })),
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["card-payouts", slug] });
  const sync = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/cards/payouts/sync/", wsPath(slug))),
    onSuccess: (rows) => { toast.success(rows.length ? `Paystack listed ${rows.length} payout${rows.length === 1 ? "" : "s"}` : "No payouts from Paystack in the last 45 days"); refresh(); },
    onError: (e) => toast.error(e.message),
  });
  const [choosing, setChoosing] = useState<CardPayout | null>(null);
  const record = useMutation({
    mutationFn: async ({ id, other }: { id: string; other?: string }) => unwrap(await api.POST("/api/v1/w/{workspace}/cards/payouts/{id}/record/", {
      params: { path: { workspace: slug, id } }, body: { other_account_id: other || null },
    })),
    onSuccess: () => { toast.success("Payout recorded as a bank transfer"); setChoosing(null); refresh(); },
    onError: (e) => toast.error(e.message),
  });
  const rows = list.data?.results ?? [];
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 px-4 py-3">
        <h2 className="mr-auto font-semibold">Payouts to your bank</h2>
        {can("cardpayments.manage") && <Button variant="secondary" loading={sync.isPending} onClick={() => sync.mutate()}>Check Paystack now</Button>}
      </div>
      {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
        <EmptyState title="No payouts yet">Paystack usually pays card takings to your bank the next working day. They appear here, and in the bank, once it does.</EmptyState>
      ) : (
        <Table head={["Date", "Payments", "Fees", "To the bank", "Check", "Status"]}>
          {rows.map((p) => (
            <tr key={p.id}>
              <Td>{p.settlement_date ? fmtDate(p.settlement_date) : "-"}<span className="block text-xs text-stone-500">Payout {p.settlement_id}</span></Td>
              <Td className="text-right font-mono">{fmt(p.total_amount)}{p.payments > 0 && <span className="block font-sans text-xs text-stone-500">{p.payments} payment{p.payments === 1 ? "" : "s"}</span>}</Td>
              <Td className="text-right font-mono">{Number(p.fees) ? fmt(p.fees) : "-"}</Td>
              <Td className="text-right font-mono">{fmt(p.amount)}</Td>
              <Td><PayoutCheck p={p} /></Td>
              <Td>
                {p.is_recorded ? <Badge tone="green">In {p.bank_account_name}</Badge> : <Badge tone={PAYOUT_TONE[p.status] ?? "amber"}>{p.status === "success" ? "To record" : p.status_label}</Badge>}
                {p.transfer_number && p.is_recorded && <Link className="block text-xs text-stone-500 hover:underline" href={`/w/${slug}/banking/transfers`}>Transfer {p.transfer_number}</Link>}
                {p.note && <span className="block text-xs text-amber-700">{p.note}</span>}
                {!p.is_recorded && p.status === "success" && can("cardpayments.manage") && (
                  <Button variant="ghost" className="mt-1" loading={record.isPending && record.variables?.id === p.id}
                    onClick={() => (Number(p.outside_net) > 0 ? setChoosing(p) : record.mutate({ id: p.id }))}>Record in the bank</Button>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}
      {choosing && <OutsidePayments payout={choosing} saving={record.isPending} error={record.error} onClose={() => setChoosing(null)}
        onSave={(other) => record.mutate({ id: choosing.id, other })} />}
    </Card>
  );
}

function PayoutCheck({ p }: { p: CardPayout }) {
  if (p.status !== "success" || !p.payments) return <span className="text-stone-400">-</span>;
  const gap = Number(p.difference);
  return (
    <div className="text-xs">
      {p.matches || (p.is_recorded && Math.abs(gap) < 0.01 && !Number(p.outside_net)) ? <Badge tone="green">Matches</Badge> : <Badge tone="amber">Check it</Badge>}
      <span className="block text-stone-500">{p.ours} of {p.payments} through MannaBooks</span>
      {Math.abs(gap) >= 0.01 && <span className="block text-amber-700">{gap < 0 ? "Short by" : "Over by"} {fmt(Math.abs(gap))}</span>}
    </div>
  );
}

/** Part of the payout was taken outside MannaBooks (say, a website on the same Paystack account): where does it belong? */
function OutsidePayments({ payout, saving, error, onClose, onSave }: { payout: CardPayout; saving: boolean; error: Error | null; onClose: () => void; onSave: (account: string) => void }) {
  const { slug } = useWorkspace();
  const accounts = useAccounts(slug);
  const [account, setAccount] = useState("");
  return (
    <Modal open title="Payments taken outside MannaBooks" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSave(account); }}>
        <p className="text-sm text-stone-600">
          {payout.payments - payout.ours} of the {payout.payments} payments in this payout ({fmt(payout.outside_net)} after Paystack&apos;s fees) weren&apos;t taken through MannaBooks.
          Choose the account they belong to, for example your online sales. The whole payout, {fmt(payout.amount)}, is then recorded as a transfer into {payout.bank_account_name ?? "the payout bank"}.
        </p>
        <Field label="Account for those payments">
          <Select required value={account} onChange={(e) => setAccount(e.target.value)}>
            <option value="">Choose an account</option>
            <AccountOptions accounts={(accounts.data ?? []).filter((a) => a.system_key !== "card_clearing")} />
          </Select>
        </Field>
        <FormError error={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving} disabled={!account}>Record in the bank</Button>
        </div>
      </form>
    </Modal>
  );
}

function RecentPayments() {
  const { slug } = useWorkspace();
  const list = useQuery({
    queryKey: ["card-transactions", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/cards/transactions/", { params: { path: { workspace: slug }, query: { page_size: 50 } as never } })),
  });
  const rows = list.data?.results ?? [];
  return (
    <Card>
      <h2 className="border-b border-stone-200 px-4 py-3 font-semibold">Recent card payments</h2>
      {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
        <EmptyState title="No card payments yet">They appear here when customers choose Pay by card on their invoice link.</EmptyState>
      ) : (
        <Table head={["Date", "Customer", "Invoice", "Amount", "Fee", "Status"]}>
          {rows.map((t) => (
            <tr key={t.id}>
              <Td>{fmtDate(t.paid_at ?? t.created_at)}</Td>
              <Td>{t.customer_name ?? t.email}<span className="block text-xs text-stone-500">{t.card_summary || t.reference}</span></Td>
              <Td>{t.invoice ? <Link className="hover:underline" href={`/w/${slug}/sales/invoices/${t.invoice}`}>{t.invoice_number}</Link> : "-"}</Td>
              <Td className="text-right font-mono">{fmt(t.amount)}</Td>
              <Td className="text-right font-mono">{Number(t.fees) ? fmt(t.fees) : "-"}</Td>
              <Td>
                <Badge tone={STATUS[t.status ?? "pending"].tone}>{STATUS[t.status ?? "pending"].label}</Badge>
                {t.result_description && <span className="block text-xs text-amber-700">{t.result_description}</span>}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}
