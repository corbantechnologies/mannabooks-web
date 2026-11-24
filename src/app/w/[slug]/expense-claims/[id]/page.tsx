"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td, Textarea } from "@/components/ui";
import { useAccounts } from "@/lib/api/accounting";
import { downloadFile, sendForm } from "@/lib/api/assets";
import { useBankAccounts } from "@/lib/api/banking";
import { api, unwrap } from "@/lib/api/client";
import { CLAIM_TONE } from "@/lib/claims";
import { fmt, fmtDate, todayIso } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { ask } from "@/components/confirm";


type Decision = { approve: boolean; reason: string; account_id: string };

/** One claim: add lines with receipts and send it; finance approves line by line and pays it back. */
export default function ExpenseClaimPage() {
  const { slug } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const path = { params: { path: { workspace: slug, id } } };
  const q = useQuery({ queryKey: ["expense-claim", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/expense-claims/{id}/", path)) });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["expense-claim", slug, id] });
  const [line, setLine] = useState({ spent_on: todayIso(), description: "", amount: "" });
  const file = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [paying, setPaying] = useState(false);
  const add = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("spent_on", line.spent_on);
      form.append("description", line.description);
      form.append("amount", line.amount);
      if (picked) form.append("receipt", picked);
      return sendForm(`/api/v1/w/${slug}/expense-claims/${id}/lines/`, form);
    },
    onSuccess: () => { setLine({ spent_on: line.spent_on, description: "", amount: "" }); setPicked(null); if (file.current) file.current.value = ""; refresh(); },
  });
  const remove = useMutation({
    mutationFn: async (lineId: string) => unwrap(await api.DELETE("/api/v1/w/{workspace}/expense-claims/{id}/lines/{line_id}/", { params: { path: { workspace: slug, id, line_id: lineId } } })),
    onSuccess: refresh, onError: (e) => toast.error(e.message),
  });
  const submit = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/expense-claims/{id}/submit/", path)),
    onSuccess: () => { toast.success("Sent for approval"); refresh(); }, onError: (e) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/w/{workspace}/expense-claims/{id}/", path)),
    onSuccess: () => router.replace(`/w/${slug}/expense-claims`), onError: (e) => toast.error(e.message),
  });
  if (q.isLoading) return <Spinner />;
  if (q.error) return <ErrorState error={q.error} />;
  const c = q.data!;
  const draft = c.status === "draft" || c.status === "rejected";
  const editable = c.mine && c.status === "draft";

  return (
    <div className="w-full">
      <Link href={`/w/${slug}/expense-claims`} className="text-sm text-stone-500 hover:underline">&larr; Expense claims</Link>
      <PageHeader title={c.title} description={`${c.number ? `${c.number} · ` : ""}${c.employee_name}`} guide="expense-claims"
        actions={<div className="flex flex-wrap gap-2">
          {c.mine && draft && <Button variant="ghost" className="text-red-600" onClick={() => void ask("Delete this claim?").then((ok) => ok && del.mutate())}>Delete</Button>}
          {c.mine && draft && <Button loading={submit.isPending} disabled={!c.lines.length} onClick={() => submit.mutate()}>{c.status === "rejected" ? "Send again" : "Send for approval"}</Button>}
          {c.can_decide && c.status === "submitted" && <Button onClick={() => setDeciding(true)}>Approve</Button>}
          {c.can_decide && (c.status === "approved" || c.status === "on_payslip") && <Button onClick={() => setPaying(true)}>Pay back</Button>}
        </div>} />
      <Card className="mb-4 grid gap-4 p-4 text-sm sm:grid-cols-4">
        <div><p className="text-stone-500">Status</p><Badge tone={CLAIM_TONE[c.status ?? "draft"]}>{c.status_label}</Badge></div>
        <div><p className="text-stone-500">Claimed</p><p className="font-mono">{fmt(c.total)}</p></div>
        <div><p className="text-stone-500">Approved</p><p className="font-mono">{c.status === "draft" || c.status === "submitted" ? "-" : fmt(c.approved_total)}</p></div>
        <div><p className="text-stone-500">Paid back</p><p>{c.paid_at ? `${fmtDate(c.paid_at)}${c.paid_from_name ? `, from ${c.paid_from_name}` : ", on the payslip"}` : c.status === "on_payslip" ? "On the next payslip" : "-"}</p></div>
        {c.decision_note && <div className="sm:col-span-4"><p className="text-stone-500">Finance&apos;s note</p><p className="whitespace-pre-line">{c.decision_note}</p></div>}
      </Card>

      <Card className="mb-4">
        <Table head={["Date", "What", "Amount", "Receipt", "Account", "", ""]}>
          {c.lines.map((ln) => (
            <tr key={ln.id} className={ln.status === "rejected" ? "bg-red-50/60" : ""}>
              <Td className="whitespace-nowrap">{fmtDate(ln.spent_on)}</Td>
              <Td>{ln.description}{ln.status === "rejected" && <span className="block text-xs text-red-700">Left out: {ln.reject_reason}</span>}</Td>
              <Td className="text-right font-mono">{fmt(ln.amount)}</Td>
              <Td>{ln.has_receipt ? <button type="button" className="inline-flex items-center gap-1 text-brand-700 hover:underline" onClick={() => void downloadFile(`/api/v1/w/${slug}/expense-claims/${id}/lines/${ln.id}/`, ln.receipt_name || "receipt").catch((e) => toast.error(e.message))}><Paperclip className="h-3.5 w-3.5" />{ln.receipt_name || "Receipt"}</button> : <span className="text-red-700">Missing</span>}</Td>
              <Td className="text-xs text-stone-600">{ln.account_name}</Td>
              <Td>{ln.status !== "pending" && <Badge tone={ln.status === "approved" ? "green" : "red"}>{ln.status_label}</Badge>}</Td>
              <Td>{editable && <button type="button" aria-label="Remove" className="text-stone-400 hover:text-red-600" onClick={() => remove.mutate(ln.id)}><Trash2 className="h-4 w-4" /></button>}</Td>
            </tr>
          ))}
        </Table>
        {!c.lines.length && <p className="px-4 py-3 text-sm text-stone-500">Nothing added yet.</p>}
      </Card>

      {editable && (
        <Card className="p-4">
          <form className="grid gap-3 sm:grid-cols-[9rem_1fr_9rem_auto_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
            <Field label="Date"><Input type="date" required value={line.spent_on} onChange={(e) => setLine((l) => ({ ...l, spent_on: e.target.value }))} /></Field>
            <Field label="What it was"><Input required value={line.description} onChange={(e) => setLine((l) => ({ ...l, description: e.target.value }))} placeholder="e.g. Fuel, Nairobi to Nakuru" /></Field>
            <Field label="Amount"><Input required inputMode="decimal" value={line.amount} onChange={(e) => setLine((l) => ({ ...l, amount: e.target.value }))} /></Field>
            <Field label="Receipt">
              <input ref={file} type="file" accept="image/*,application/pdf" className="block w-52 text-sm" onChange={(e) => setPicked(e.target.files?.[0] ?? null)} />
            </Field>
            <Button type="submit" loading={add.isPending}>Add</Button>
          </form>
          <FormError error={add.error} />
          <p className="mt-2 text-xs text-stone-500">Each line needs a receipt before you send it. On a phone, choose the file box to take a photo.</p>
        </Card>
      )}
      {deciding && <DecideModal claim={c} onClose={() => { setDeciding(false); refresh(); }} />}
      {paying && <PayModal claimId={id} total={c.approved_total} onClose={() => { setPaying(false); refresh(); }} />}
    </div>
  );
}

function DecideModal({ claim, onClose }: { claim: { id: string; lines: { id: string; description: string; amount: string; account_id: string | null }[] }; onClose: () => void }) {
  const { slug } = useWorkspace();
  const accounts = useAccounts(slug);
  const expense = (accounts.data ?? []).filter((a) => a.account_type === "expense" && a.is_active);
  const [d, setD] = useState<Record<string, Decision>>(() => Object.fromEntries(claim.lines.map((l) => [l.id, { approve: true, reason: "", account_id: l.account_id ?? "" }])));
  const [note, setNote] = useState("");
  const set = (id: string, patch: Partial<Decision>) => setD((x) => ({ ...x, [id]: { ...x[id], ...patch } }));
  const total = claim.lines.filter((l) => d[l.id]?.approve).reduce((s, l) => s + Number(l.amount), 0);
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/expense-claims/{id}/decide/", { params: { path: { workspace: slug, id: claim.id } }, body: {
      note, lines: claim.lines.map((l) => ({ line_id: l.id, approve: d[l.id].approve, reason: d[l.id].reason, account_id: d[l.id].account_id || null })),
    } as never })),
    onSuccess: (r) => { toast.success(r.status === "rejected" ? "Not approved" : r.status === "submitted" ? "Approved at your level" : `Approved: ${fmt(r.approved_total)}`); onClose(); },
  });
  return (
    <Modal size="lg" open title="Approve the claim" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <p className="text-sm text-stone-600">Untick anything that isn&apos;t a business expense and say why; they see your reason. Choose the account each goes to.</p>
        <div className="space-y-2">
          {claim.lines.map((l) => (
            <div key={l.id} className="rounded-md border border-stone-200 p-2">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={d[l.id].approve} onChange={(e) => set(l.id, { approve: e.target.checked })} />{l.description}</label>
                <span className="ml-auto font-mono">{fmt(l.amount)}</span>
              </div>
              {d[l.id].approve ? (
                <Select className="mt-2 text-sm" value={d[l.id].account_id} onChange={(e) => set(l.id, { account_id: e.target.value })}>
                  <option value="">Staff expenses</option>
                  {expense.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                </Select>
              ) : <Input className="mt-2 text-sm" required placeholder="Why it isn't a business expense" value={d[l.id].reason} onChange={(e) => set(l.id, { reason: e.target.value })} />}
            </div>
          ))}
        </div>
        <Field label="Note to them (optional)"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <FormError error={save.error} />
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm">Approving <b className="font-mono">{fmt(total)}</b></span>
          <div className="flex gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>{total > 0 ? "Approve" : "Don't approve"}</Button></div>
        </div>
      </form>
    </Modal>
  );
}

function PayModal({ claimId, total, onClose }: { claimId: string; total: string; onClose: () => void }) {
  const { slug } = useWorkspace();
  const banks = useBankAccounts(slug);
  const [how, setHow] = useState<"account" | "payslip">("account");
  const [account, setAccount] = useState("");
  const [on, setOn] = useState(todayIso());
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/expense-claims/{id}/pay/", { params: { path: { workspace: slug, id: claimId } },
      body: { how, account_id: how === "account" ? account : null, paid_on: on } as never })),
    onSuccess: (r) => { toast.success(r.status === "on_payslip" ? "It goes on their next payslip" : "Paid back"); onClose(); },
  });
  return (
    <Modal open title={`Pay back ${fmt(total)}`} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="radio" checked={how === "account"} onChange={() => setHow("account")} /> Now, from an account</label>
          <label className="flex items-center gap-2"><input type="radio" checked={how === "payslip"} onChange={() => setHow("payslip")} /> On their next payslip</label>
        </div>
        {how === "account" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Paid from"><Select required value={account} onChange={(e) => setAccount(e.target.value)}><option value="">Choose</option>{(banks.data?.results ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
            <Field label="On"><Input type="date" value={on} onChange={(e) => setOn(e.target.value)} /></Field>
          </div>
        ) : <p className="text-sm text-stone-600">Added to their next payroll as a refund: it raises their take-home pay but isn&apos;t taxed and doesn&apos;t count for NSSF, SHIF or the Housing Levy.</p>}
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>{how === "account" ? "Record payment" : "Put on payslip"}</Button></div>
      </form>
    </Modal>
  );
}
