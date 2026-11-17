"use client";

import { Plus, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { OwnerEditor, OwnerMoneyModal } from "@/components/owner-money";
import { Button, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { useOwners } from "@/lib/api/owners";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

/** Owners, partners, directors and shareholders: what each has put in, lent, borrowed and drawn. */
export default function OwnersPage() {
  const { slug, can } = useWorkspace();
  const router = useRouter();
  const owners = useOwners(slug);
  const [adding, setAdding] = useState(false);
  const [recording, setRecording] = useState(false);
  const rows = owners.data?.results ?? [];
  const total = (key: "capital" | "owed_to" | "owed_by") => rows.reduce((s, r) => s + Number(r.balances[key]), 0);
  const money = (v: string | number) => (Number(v) ? fmt(v) : <span className="text-stone-400">-</span>);
  return (
    <div className="space-y-6">
      <PageHeader title="Owners and directors" guide="owners"
        description="Money between the business and the people who own or run it: capital, shares, loans either way and drawings. Each person has their own account."
        actions={can("owners.record") && <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setAdding(true)}><UserPlus className="h-4 w-4" /> Add a person</Button>
          <Button disabled={!rows.length} onClick={() => setRecording(true)}><Plus className="h-4 w-4" /> Record money</Button>
        </div>} />
      {owners.isLoading ? <Spinner /> : owners.error ? <ErrorState error={owners.error} /> : rows.length === 0 ? (
        <Card><EmptyState title="No owners or directors yet">Add the people who own or run the business, then record what they put in, lend or take out.</EmptyState></Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4"><p className="text-sm text-stone-500">Capital and shares put in</p><p className="text-2xl font-semibold">{fmt(total("capital"))}</p></Card>
            <Card className="p-4"><p className="text-sm text-stone-500">The business owes them</p><p className="text-2xl font-semibold">{fmt(total("owed_to"))}</p></Card>
            <Card className="p-4"><p className="text-sm text-stone-500">They owe the business</p><p className="text-2xl font-semibold">{fmt(total("owed_by"))}</p></Card>
          </div>
          <Card>
            <Table head={["Name", "Capital and shares", "Owed to them", "Owed by them", "Drawings this year", "Last money"]}>
              {rows.map((o) => (
                <tr key={o.id} className="cursor-pointer hover:bg-stone-50" onClick={() => router.push(`/w/${slug}/banking/owners/${o.id}`)}>
                  <Td className="font-medium">{o.name}<span className="block text-xs font-normal text-stone-500">{o.role_label}{o.is_active ? "" : " · no longer involved"}</span></Td>
                  <Td className="text-right font-mono">{money(o.balances.capital)}</Td>
                  <Td className="text-right font-mono">{money(o.balances.owed_to)}</Td>
                  <Td className="text-right font-mono">{money(o.balances.owed_by)}</Td>
                  <Td className="text-right font-mono">{money(o.drawings_this_year)}</Td>
                  <Td>{o.last_date ? fmtDate(o.last_date) : "-"}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}
      {adding && <OwnerEditor owner="new" onClose={() => setAdding(false)} />}
      {recording && <OwnerMoneyModal onClose={() => setRecording(false)} />}
    </div>
  );
}
