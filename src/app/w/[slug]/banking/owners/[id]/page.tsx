"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { ask } from "@/components/confirm";
import { ActionMenu } from "@/components/action-menu";
import { OwnerBulkForm, OwnerEditor, OwnerMoneyModal } from "@/components/owner-money";
import { AsPage, Badge, Button, Card, EmptyState, ErrorState, Field, Input, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { PRESETS, type Preset, presetRange } from "@/lib/date-presets";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { useFormFlag } from "@/lib/page-form";

/** One owner's or director's account: every movement of money, and their balances after each. */
export default function OwnerStatementPage() {
  const { slug, can, context } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const [editing, setEditing] = useFormFlag("edit");
  const [recording, setRecording] = useFormFlag("money");
  const [bulk, setBulk] = useFormFlag("bulk");
  // the statement for a month by default, or the dates chosen
  const [preset, setPreset] = useState<Preset>("this_month");
  const [range, setRange] = useState<[string, string]>(() => presetRange("this_month"));
  const [from, to] = range;
  const q = useQuery({
    queryKey: ["owner-statement", slug, id, from, to],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/owners/{id}/statement/", {
      params: { path: { workspace: slug, id }, query: { from: from || undefined, to: to || undefined } },
    })),
    placeholderData: (prev) => prev,
  });
  const pdfUrl = `/api/backend/api/v1/w/${slug}/owners/${id}/statement/pdf/?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) })}`;
  const voidIt = useMutation({
    mutationFn: async (tid: string) => unwrap(await api.POST("/api/v1/w/{workspace}/owners/transactions/{id}/void/", { params: { path: { workspace: slug, id: tid } } })),
    onSuccess: () => { toast.success("Voided: its entry is reversed"); void q.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  if (q.isLoading) return <Spinner />;
  if (q.error) return <ErrorState error={q.error} />;
  const { owner, balances, rows, opening, closing, start, money_in, money_out } = q.data!;
  const money = (v?: string | null) => (v && Number(v) ? fmt(v) : "");
  if (recording) {
    return <AsPage guide="owners"><OwnerMoneyModal ownerId={owner.id} onClose={() => { setRecording(false); void q.refetch(); }} /></AsPage>;
  }
  if (bulk) {
    return <AsPage guide="owners"><OwnerBulkForm ownerId={owner.id} ownerName={owner.name} onClose={() => { setBulk(false); void q.refetch(); }} /></AsPage>;
  }
  if (editing) {
    return <AsPage guide="owners"><OwnerEditor owner={owner} onClose={() => { setEditing(false); void q.refetch(); }} /></AsPage>;
  }
  return (
    <div className="space-y-6">
      <Link href={`/w/${slug}/banking/owners`} className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800 print:hidden"><ArrowLeft className="h-4 w-4" /> Owners and directors</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{owner.name}</h1>
          <p className="text-sm text-stone-600">{[owner.role_label, owner.phone, owner.email, owner.kra_pin && `KRA PIN ${owner.kra_pin}`].filter(Boolean).join(" · ")}</p>
          {owner.membership_name && <p className="text-xs text-stone-500">Uses MannaBooks as {owner.membership_name}: sees this account on their Me page.</p>}
          {!owner.is_active && <Badge>No longer involved</Badge>}
        </div>
        <div className="print:hidden">
          <ActionMenu label="Actions" primary actions={[
            { label: "Record money", onClick: () => setRecording(true), hidden: !(can("owners.record") && owner.is_active) },
            { label: "Record in bulk", onClick: () => setBulk(true), hidden: !(can("owners.record") && owner.is_active) },
            { label: "Edit", onClick: () => setEditing(true), hidden: !can("owners.record") },
            { label: "Download statement (PDF)", onClick: () => window.open(pdfUrl, "_blank", "noopener"), hidden: !context.pdf_enabled },
            { label: context.pdf_enabled ? "Print this page" : "Print or save as PDF", onClick: () => window.print() },
          ]} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <Tile label="Capital put in" value={balances.capital} />
        <Tile label="Paid for shares" value={balances.shares} />
        <Tile label="The business owes them" value={balances.owed_to} warn={Number(balances.owed_to) < 0} />
        <Tile label="They owe the business" value={balances.owed_by} warn={Number(balances.owed_by) < 0} />
        <Tile label="Drawings, all time" value={balances.drawings} />
      </div>

      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <Field label="Statement for">
          <Select value={preset} onChange={(e) => { const p = e.target.value as Preset; setPreset(p); if (p !== "custom") setRange(presetRange(p)); }}>
            {PRESETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="From"><Input type="date" value={from} onChange={(e) => { setPreset("custom"); setRange([e.target.value, to]); }} /></Field>
        <Field label="To"><Input type="date" value={to} onChange={(e) => { setPreset("custom"); setRange([from, e.target.value]); }} /></Field>
        <p className="pb-2 text-sm text-stone-600">In {fmt(money_in)} · out {fmt(money_out)}</p>
      </div>
      <Card>
        {rows.length === 0 && !start ? <EmptyState title="Nothing recorded yet" /> : rows.length === 0 ? <EmptyState title="Nothing in these dates">The balances are as brought forward: owed to them {fmt(opening.owed_to)}, owed by them {fmt(opening.owed_by)}.</EmptyState> : (
          <Table head={["Date", "What", "In", "Out", "Capital", "Shares", "Owed to them", "Owed by them", ""]}>
            <tr className="bg-stone-50 font-medium"><Td>{to ? fmtDate(to) : "Now"}</Td><Td>Carried forward</Td><Td /><Td />
              <Td className="text-right font-mono">{fmt(closing.capital)}</Td><Td className="text-right font-mono">{fmt(closing.shares)}</Td>
              <Td className="text-right font-mono">{fmt(closing.owed_to)}</Td><Td className="text-right font-mono">{fmt(closing.owed_by)}</Td><Td /></tr>
            {[...rows].reverse().map(({ transaction: t, ...r }) => ( // newest first; each row keeps its balances after it
              <tr key={t.id}>
                <Td className="whitespace-nowrap">{fmtDate(t.transaction_date)}</Td>
                <Td>{t.kind === "opening" ? `Brought forward: ${t.opening_balance_label}` : t.kind_label}
                  <span className="block text-xs text-stone-500">{[t.number, t.bank_account_name, t.reference, t.share_count && `${t.share_count} shares`, t.repay_by && `repay by ${fmtDate(t.repay_by)}`].filter(Boolean).join(" · ")}</span>
                  {t.notes && <span className="block text-xs text-stone-500">{t.notes}</span>}
                </Td>
                <Td className="text-right font-mono">{t.kind === "opening" ? "" : money(r.money_in)}</Td>
                <Td className="text-right font-mono">{t.kind === "opening" ? "" : money(r.money_out)}</Td>
                <Td className="text-right font-mono">{fmt(r.capital)}</Td>
                <Td className="text-right font-mono">{fmt(r.shares)}</Td>
                <Td className="text-right font-mono">{fmt(r.owed_to)}</Td>
                <Td className="text-right font-mono">{fmt(r.owed_by)}</Td>
                <Td className="print:hidden">{can("owners.record") && <Button variant="ghost" className="px-2 py-1 text-red-600"
                  onClick={() => void ask(`Void ${t.number}? Its entry is reversed and the balances change.`).then((ok) => ok && voidIt.mutate(t.id))}>Void</Button>}</Td>
              </tr>
            ))}
            {start && <tr className="bg-stone-50 font-medium"><Td>{fmtDate(start)}</Td><Td>Brought forward</Td><Td /><Td />
              <Td className="text-right font-mono">{fmt(opening.capital)}</Td><Td className="text-right font-mono">{fmt(opening.shares)}</Td>
              <Td className="text-right font-mono">{fmt(opening.owed_to)}</Td><Td className="text-right font-mono">{fmt(opening.owed_by)}</Td><Td /></tr>}
          </Table>
        )}
      </Card>
    </div>
  );
}

function Tile({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <Card className={`p-4 ${warn ? "border-amber-300" : ""}`}>
      <p className="text-sm text-stone-500">{label}</p>
      <p className="break-words text-xl font-semibold tabular-nums sm:text-2xl">{fmt(value)}</p>
      {warn && <p className="text-xs text-amber-700">Below nothing: a repayment is more than the loan. Check the entries.</p>}
    </Card>
  );
}
