"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, PageHeader, PasswordInput, Select, Spinner, Table, Td } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { useDepositAccounts } from "@/lib/api/sales";
import type { components } from "@/lib/api/schema";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

type CardConnection = components["schemas"]["CardConnection"];

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
      </div>
      {conn.isLoading ? <Spinner /> : conn.error ? <ErrorState error={conn.error} /> : <ConnectionForm conn={conn.data!} />}
      {can("cardpayments.view") && <RecentPayments />}
    </div>
  );
}

function ConnectionForm({ conn }: { conn: CardConnection }) {
  const { slug, can } = useWorkspace();
  const qc = useQueryClient();
  const manage = can("cardpayments.manage");
  const deposits = useDepositAccounts(slug);
  const [form, setForm] = useState({ public_key: conn.public_key ?? "", secret_key: "", deposit_account_id: conn.deposit_account_id ?? "", is_active: conn.is_active ?? false });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["card-connection", slug] });
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PUT("/api/v1/w/{workspace}/cards/connection/", {
      ...wsPath(slug), body: { provider: "paystack", ...form, deposit_account_id: form.deposit_account_id || null },
    })),
    onSuccess: () => { toast.success("Card payment settings saved"); setForm((p) => ({ ...p, secret_key: "" })); refresh(); },
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
