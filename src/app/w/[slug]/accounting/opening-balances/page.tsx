"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, ErrorState, Field, FormError, Input, PageHeader, Spinner } from "@/components/ui";
import { ACCOUNT_TYPES, useAccounts } from "@/lib/api/accounting";
import { api, unwrap } from "@/lib/api/client";
import type { LedgerAccount, OpeningBalance } from "@/lib/api/types";
import { fmt } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function OpeningBalancesPage() {
  const { slug } = useWorkspace();
  const ob = useQuery({ queryKey: ["opening-balances", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/opening-balances/", wsPath(slug))) });
  const accounts = useAccounts(slug);
  if (ob.isLoading || accounts.isLoading) return <Spinner />;
  if (ob.error || accounts.error) return <ErrorState error={ob.error || accounts.error} />;
  return <OpeningBalanceForm initial={ob.data!} accounts={(accounts.data ?? []).filter((a) => a.is_active && a.system_key !== "opening_balance_equity")} />;
}

function OpeningBalanceForm({ initial, accounts }: { initial: OpeningBalance; accounts: LedgerAccount[] }) {
  const { slug, can } = useWorkspace();
  const p = wsPath(slug);
  const manage = can("openingbalances.manage");
  const posted = initial.status === "posted";
  const [asOf, setAsOf] = useState(initial.as_of_date ?? "");
  const [amounts, setAmounts] = useState<Record<string, { debit: string; credit: string }>>(
    Object.fromEntries(initial.lines.map((l) => [l.account_id, { debit: Number(l.debit) ? String(l.debit) : "", credit: Number(l.credit) ? String(l.credit) : "" }])),
  );
  const totalDebit = Object.values(amounts).reduce((s, a) => s + (Number(a.debit) || 0), 0);
  const totalCredit = Object.values(amounts).reduce((s, a) => s + (Number(a.credit) || 0), 0);
  const difference = Math.round((totalDebit - totalCredit) * 100) / 100;

  const save = useMutation({
    mutationFn: async () => unwrap(await api.PUT("/api/v1/w/{workspace}/opening-balances/", {
      ...p,
      body: {
        as_of_date: asOf,
        notes: initial.notes ?? "",
        lines: Object.entries(amounts).filter(([, a]) => Number(a.debit) || Number(a.credit)).map(([account_id, a]) => ({ account_id, debit: a.debit || "0", credit: a.credit || "0" })),
      },
    })),
    onSuccess: () => toast.success("Opening balances saved"),
  });
  const post = useMutation({
    mutationFn: async () => { await save.mutateAsync(); return unwrap(await api.POST("/api/v1/w/{workspace}/opening-balances/post/", p)); },
    onSuccess: (r) => toast.success(`Posted as ${r.journal_number}`),
  });
  const unpost = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/opening-balances/unpost/", p)),
    onSuccess: () => toast.success("Opening balances are a draft again"),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="w-full">
      <PageHeader
        title="Opening balances"
        description="What each account held on the day before you started using MannaBooks. Any difference between debits and credits goes to Opening balance equity."
        guide="opening-balances"
        actions={posted ? <Badge tone="green">Posted {initial.journal_number}</Badge> : <Badge tone="amber">Draft</Badge>}
      />
      <Card className="mb-4 flex flex-wrap items-end gap-4 p-4">
        <Field label="Balances as at" hint="Must fall in an open month. Add an earlier financial year if needed."><Input type="date" disabled={posted || !manage} value={asOf} onChange={(e) => setAsOf(e.target.value)} /></Field>
        <div className="text-sm text-stone-600">
          Debits <span className="font-mono">{fmt(totalDebit)}</span> &middot; Credits <span className="font-mono">{fmt(totalCredit)}</span>
          {difference !== 0 && <span className="ml-2 text-amber-700">Difference {fmt(Math.abs(difference))} to Opening balance equity</span>}
        </div>
      </Card>
      {ACCOUNT_TYPES.map((t) => {
        const group = accounts.filter((a) => a.account_type === t.value && !["income", "expense"].includes(a.account_type));
        if (!group.length) return null;
        return (
          <Card key={t.value} className="mb-4">
            <p className="px-4 pt-3 text-sm font-semibold">{t.label}</p>
            <div className="divide-y divide-stone-100">
              {group.map((a) => (
                <div key={a.id} className="grid grid-cols-[1fr_9rem_9rem] items-center gap-3 px-4 py-2 text-sm">
                  <span><span className="font-mono text-xs text-stone-500">{a.code}</span> {a.name}</span>
                  <Input aria-label={`${a.name} debit`} placeholder="Debit" inputMode="decimal" className="text-right" disabled={posted || !manage}
                    value={amounts[a.id]?.debit ?? ""} onChange={(e) => setAmounts((prev) => ({ ...prev, [a.id]: { debit: e.target.value, credit: "" } }))} />
                  <Input aria-label={`${a.name} credit`} placeholder="Credit" inputMode="decimal" className="text-right" disabled={posted || !manage}
                    value={amounts[a.id]?.credit ?? ""} onChange={(e) => setAmounts((prev) => ({ ...prev, [a.id]: { credit: e.target.value, debit: "" } }))} />
                </div>
              ))}
            </div>
          </Card>
        );
      })}
      <FormError error={save.error || post.error} />
      {manage && (
        <div className="flex justify-end gap-2">
          {posted ? (
            <Button variant="secondary" loading={unpost.isPending} onClick={() => unpost.mutate()}>Unpost to edit</Button>
          ) : (
            <>
              <Button variant="secondary" loading={save.isPending && !post.isPending} onClick={() => save.mutate()}>Save draft</Button>
              <Button loading={post.isPending} onClick={() => post.mutate()}>Post opening balances</Button>
            </>
          )}
        </div>
      )}
      <p className="mt-4 text-xs text-stone-500">
        Customer and supplier balances will be entered per customer and supplier once those modules arrive; until then, put their totals on Accounts receivable and Accounts payable. See the <Link href="/guide/opening-balances" className="underline">guide</Link>.
      </p>
    </div>
  );
}
