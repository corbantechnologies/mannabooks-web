"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown, Plus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { ask } from "@/components/confirm";
import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { depositFor, useCustomers, useDepositAccounts } from "@/lib/api/sales";
import { fmt, fmtDate, todayIso } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

type Voucher = components["schemas"]["GiftVoucher"];

const STATUS = {
  active: { label: "Active", tone: "green" },
  spent: { label: "Spent", tone: "stone" },
  expired: { label: "Expired", tone: "amber" },
  void: { label: "Void", tone: "red" },
} as const;

const ENTRY = { issue: "Issued", spend: "Spent", refund: "Given back", expire: "Expired unspent", void: "Voided" } as Record<string, string>;
const PAY = [{ value: "cash", label: "Cash" }, { value: "mpesa", label: "M-Pesa" }, { value: "bank", label: "Bank transfer" }, { value: "card", label: "Card" }];

/** Gift vouchers: sold (the money is owed to the holder until they spend it) or given free, spent at the till or on an invoice. */
export default function GiftVouchersPage() {
  const { slug, can, context } = useWorkspace();
  const qc = useQueryClient();
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const list = useQuery({
    queryKey: ["gift-vouchers", slug, status, search],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/gift-vouchers/", {
      params: { path: { workspace: slug }, query: { status: (status || undefined) as never, search: search || undefined, page_size: 200 } as never },
    })),
  });
  const [selling, setSelling] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = list.data?.results ?? [];
  const owed = rows.filter((v) => v.status === "active").reduce((a, v) => a + Number(v.balance), 0);
  const cur = context.workspace.currency;
  return (
    <div className="w-full">
      <PageHeader title="Gift vouchers" guide="gift-vouchers"
        description={`Sell a voucher now and the customer spends it later, at the till or on an invoice. Until it is spent, its value is owed to them. Amounts in ${cur}.`}
        actions={can("giftvouchers.sell") && <Button onClick={() => setSelling(true)}><Plus className="h-4 w-4" /> Sell a voucher</Button>} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="active">Active</option><option value="spent">Spent</option><option value="expired">Expired</option><option value="void">Void</option><option value="">All</option>
        </Select>
        <Input placeholder="Search code or name" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        {status === "active" && rows.length > 0 && <span className="ml-auto text-sm text-stone-600">Still to be spent: <span className="font-mono font-semibold">{fmt(owed)}</span></span>}
      </div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title={status === "active" ? "No active vouchers" : "No vouchers here"}>Sell one and give the customer its code or the printed voucher.</EmptyState>
        ) : (
          <Table head={["Code", "For", "Value", "Left", "Valid until", "Status"]}>
            {rows.map((v) => (
              <tr key={v.id} className="cursor-pointer hover:bg-stone-50" onClick={() => setOpenId(v.id)}>
                <Td><span className="font-mono font-medium">{v.code}</span>{v.kind === "free" && <span className="ml-2 text-xs text-stone-500">free</span>}</Td>
                <Td>{v.recipient_name || v.customer_name || "-"}</Td>
                <Td className="text-right font-mono">{fmt(v.value)}</Td>
                <Td className="text-right font-mono">{fmt(v.balance)}</Td>
                <Td>{v.expires_on ? fmtDate(v.expires_on) : "No expiry"}</Td>
                <Td><Badge tone={STATUS[v.status ?? "active"].tone}>{STATUS[v.status ?? "active"].label}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {selling && <SellVoucher onClose={() => setSelling(false)} onDone={(v) => { setSelling(false); void qc.invalidateQueries({ queryKey: ["gift-vouchers", slug] }); setOpenId(v.id); }} />}
      {openId && <VoucherDetail id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function SellVoucher({ onClose, onDone }: { onClose: () => void; onDone: (v: Voucher) => void }) {
  const { slug, can } = useWorkspace();
  const accounts = useDepositAccounts(slug);
  const customers = useCustomers(slug);
  const [f, setF] = useState({ value: "", kind: "sold", method: "mpesa", deposit_account_id: "", payment_reference: "", recipient_name: "", customer_id: "", expires_on: "", code: "", notes: "" });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const account = f.deposit_account_id || depositFor(accounts.data ?? [], f.method);
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/gift-vouchers/", {
      params: { path: { workspace: slug } },
      body: {
        value: f.value, kind: f.kind, issue_date: todayIso(), recipient_name: f.recipient_name, notes: f.notes, code: f.code,
        customer_id: f.customer_id || null, expires_on: f.expires_on || null,
        ...(f.kind === "sold" ? { method: f.method, deposit_account_id: account || null, payment_reference: f.payment_reference } : {}),
      } as never,
    })),
    onSuccess: (v) => { toast.success(`Voucher ${v.code} ${v.kind === "free" ? "given" : "sold"}`); onDone(v); },
  });
  return (
    <Modal open title="Sell a gift voucher" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Value"><Input required inputMode="decimal" value={f.value} onChange={(e) => set("value", e.target.value)} placeholder="2000" /></Field>
          <Field label="Valid until (optional)" hint="Blank: no expiry. What's left at expiry becomes income."><Input type="date" value={f.expires_on} onChange={(e) => set("expires_on", e.target.value)} /></Field>
        </div>
        {can("giftvouchers.manage") && (
          <Field label="How">
            <Select value={f.kind} onChange={(e) => set("kind", e.target.value)}>
              <option value="sold">Sold: the customer pays for it</option>
              <option value="free">Given free: a promotion or a goodwill gesture</option>
            </Select>
          </Field>
        )}
        {f.kind === "sold" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Paid by"><Select value={f.method} onChange={(e) => setF((x) => ({ ...x, method: e.target.value, deposit_account_id: "" }))}>{PAY.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
            <Field label="Into"><Select value={account} onChange={(e) => set("deposit_account_id", e.target.value)}>{(accounts.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
            {f.method !== "cash" && <Field label={f.method === "mpesa" ? "M-Pesa code" : "Reference"}><Input required={f.method === "mpesa"} value={f.payment_reference} onChange={(e) => set("payment_reference", e.target.value)} /></Field>}
          </div>
        ) : <p className="text-xs text-stone-500">Its value is recorded as a promotional cost now; spending it later pays for the goods like money would.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="For (optional)" hint="Printed on the voucher"><Input value={f.recipient_name} onChange={(e) => set("recipient_name", e.target.value)} placeholder="Amina Otieno" /></Field>
          <Field label="Bought by (optional)">
            <Select value={f.customer_id} onChange={(e) => set("customer_id", e.target.value)}>
              <option value="">Walk-in customer</option>
              {(customers.data?.results ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Code (optional)" hint="Blank: MannaBooks makes a code that's hard to guess."><Input value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="Leave blank" /></Field>
        <Field label="Notes (optional)"><Textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>{f.kind === "free" ? "Give voucher" : "Sell voucher"}</Button></div>
      </form>
    </Modal>
  );
}

function VoucherDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { slug, can } = useWorkspace();
  const qc = useQueryClient();
  const v = useQuery({
    queryKey: ["gift-voucher", slug, id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/gift-vouchers/{id}/", { params: { path: { workspace: slug, id } } })),
  });
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const voidIt = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/gift-vouchers/{id}/void/", { params: { path: { workspace: slug, id } }, body: { reason } })),
    onSuccess: () => { toast.success("Voucher voided"); setVoiding(false); void qc.invalidateQueries({ queryKey: ["gift-vouchers", slug] }); void qc.invalidateQueries({ queryKey: ["gift-voucher", slug, id] }); },
  });
  const d = v.data;
  const unspent = d && d.status === "active" && Number(d.balance) === Number(d.value);
  return (
    <Modal open title={d ? `Voucher ${d.code}` : "Voucher"} onClose={onClose}>
      {v.isLoading ? <Spinner /> : v.error ? <ErrorState error={v.error} /> : d && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-2xl font-semibold tracking-wider">{d.code}</span>
            <Badge tone={STATUS[d.status ?? "active"].tone}>{STATUS[d.status ?? "active"].label}</Badge>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-stone-500">Value</dt><dd className="font-mono">{fmt(d.value)}</dd>
            <dt className="text-stone-500">Left</dt><dd className="font-mono font-semibold">{fmt(d.balance)}</dd>
            <dt className="text-stone-500">Issued</dt><dd>{fmtDate(d.issue_date)}{d.kind === "free" ? ", given free" : d.deposit_account_name ? `, paid into ${d.deposit_account_name}` : ""}</dd>
            <dt className="text-stone-500">Valid until</dt><dd>{d.expires_on ? fmtDate(d.expires_on) : "No expiry"}</dd>
            {(d.recipient_name || d.customer_name) && <><dt className="text-stone-500">For</dt><dd>{[d.recipient_name, d.customer_name && `bought by ${d.customer_name}`].filter(Boolean).join(", ")}</dd></>}
            {d.void_reason && <><dt className="text-stone-500">Voided</dt><dd>{d.void_reason}</dd></>}
          </dl>
          <div>
            <h3 className="mb-1 text-sm font-semibold">History</h3>
            <ul className="divide-y divide-stone-100 rounded-md border border-stone-200 text-sm">
              {(d.entries ?? []).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                  <span>{ENTRY[e.kind] ?? e.kind}{e.document_number ? ` · ${e.document_type === "receipt" ? "cash sale" : "payment"} ${e.document_number}` : ""}<span className="block text-xs text-stone-500">{fmtDate(e.entry_date)}{e.created_by_name ? `, ${e.created_by_name}` : ""}</span></span>
                  <span className={e.kind === "spend" || e.kind === "expire" || e.kind === "void" ? "font-mono text-red-700" : "font-mono"}>{e.kind === "spend" || e.kind === "expire" || e.kind === "void" ? "-" : "+"}{fmt(e.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
          {voiding ? (
            <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); voidIt.mutate(); }}>
              <Field label="Why is it being voided?" hint="If the customer paid, refund them separately."><Input required value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
              <FormError error={voidIt.error} />
              <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setVoiding(false)}>Back</Button><Button type="submit" variant="danger" loading={voidIt.isPending}>Void voucher</Button></div>
            </form>
          ) : (
            <div className="flex flex-wrap justify-end gap-2">
              {can("giftvouchers.manage") && unspent && (
                <Button variant="ghost" className="text-red-600" onClick={() => void ask(`Void voucher ${d.code}? It can't be used after this.`, { danger: true, confirmLabel: "Continue" }).then((ok) => ok && setVoiding(true))}>Void</Button>
              )}
              <Button variant="secondary" onClick={() => window.open(`/api/backend/api/v1/w/${slug}/gift-vouchers/${d.id}/pdf/`, "_blank", "noopener")}><FileDown className="h-4 w-4" /> Voucher PDF</Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
