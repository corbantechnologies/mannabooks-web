"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { ask } from "@/components/confirm";
import { OwnerEditor, OwnerMoneyModal } from "@/components/owner-money";
import { Badge, Button, Card, EmptyState, ErrorState, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

/** One owner's or director's account: every movement of money, and their balances after each. */
export default function OwnerStatementPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const [editing, setEditing] = useState(false);
  const [recording, setRecording] = useState(false);
  const q = useQuery({
    queryKey: ["owner-statement", slug, id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/owners/{id}/statement/", { params: { path: { workspace: slug, id } } })),
  });
  const voidIt = useMutation({
    mutationFn: async (tid: string) => unwrap(await api.POST("/api/v1/w/{workspace}/owners/transactions/{id}/void/", { params: { path: { workspace: slug, id: tid } } })),
    onSuccess: () => { toast.success("Voided: its entry is reversed"); void q.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  if (q.isLoading) return <Spinner />;
  if (q.error) return <ErrorState error={q.error} />;
  const { owner, balances, rows } = q.data!;
  const money = (v?: string | null) => (v && Number(v) ? fmt(v) : "");
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
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
          {can("owners.record") && <Button variant="secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</Button>}
          {can("owners.record") && owner.is_active && <Button onClick={() => setRecording(true)}><Plus className="h-4 w-4" /> Record money</Button>}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Capital and shares put in" value={balances.capital} />
        <Tile label="The business owes them" value={balances.owed_to} warn={Number(balances.owed_to) < 0} />
        <Tile label="They owe the business" value={balances.owed_by} warn={Number(balances.owed_by) < 0} />
        <Tile label="Drawings, all time" value={balances.drawings} />
      </div>

      <Card>
        {rows.length === 0 ? <EmptyState title="Nothing recorded yet" /> : (
          <Table head={["Date", "What", "In", "Out", "Capital", "Owed to them", "Owed by them", ""]}>
            {rows.map(({ transaction: t, ...r }) => (
              <tr key={t.id}>
                <Td className="whitespace-nowrap">{fmtDate(t.transaction_date)}</Td>
                <Td>{t.kind === "opening" ? `Brought forward: ${t.opening_balance_label}` : t.kind_label}
                  <span className="block text-xs text-stone-500">{[t.number, t.bank_account_name, t.reference, t.share_count && `${t.share_count} shares`, t.repay_by && `repay by ${fmtDate(t.repay_by)}`].filter(Boolean).join(" · ")}</span>
                  {t.notes && <span className="block text-xs text-stone-500">{t.notes}</span>}
                </Td>
                <Td className="text-right font-mono">{t.kind === "opening" ? "" : money(r.money_in)}</Td>
                <Td className="text-right font-mono">{t.kind === "opening" ? "" : money(r.money_out)}</Td>
                <Td className="text-right font-mono">{fmt(r.capital)}</Td>
                <Td className="text-right font-mono">{fmt(r.owed_to)}</Td>
                <Td className="text-right font-mono">{fmt(r.owed_by)}</Td>
                <Td className="print:hidden">{can("owners.record") && <Button variant="ghost" className="px-2 py-1 text-red-600"
                  onClick={() => void ask(`Void ${t.number}? Its entry is reversed and the balances change.`).then((ok) => ok && voidIt.mutate(t.id))}>Void</Button>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {editing && <OwnerEditor owner={owner} onClose={() => { setEditing(false); void q.refetch(); }} />}
      {recording && <OwnerMoneyModal ownerId={owner.id} onClose={() => { setRecording(false); void q.refetch(); }} />}
    </div>
  );
}

function Tile({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <Card className={`p-4 ${warn ? "border-amber-300" : ""}`}>
      <p className="text-sm text-stone-500">{label}</p>
      <p className="text-2xl font-semibold">{fmt(value)}</p>
      {warn && <p className="text-xs text-amber-700">Below nothing: a repayment is more than the loan. Check the entries.</p>}
    </Card>
  );
}
