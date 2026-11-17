"use client";

import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

/** A director's or owner's own account with the business (shown only when their login is linked to one). Read-only. */
export function MyOwnerAccount() {
  const { slug } = useWorkspace();
  const q = useQuery({
    queryKey: ["owner-mine", slug], retry: false,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/owners/mine/", wsPath(slug))),
  });
  if (!q.data) return null;
  const { owner, balances, rows } = q.data;
  const recent = [...rows].reverse().slice(0, 5);
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">My account as {owner.role_label.toLowerCase()}</h2>
      <Card className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-stone-500">Capital and shares</p><p className="text-lg font-semibold">{fmt(balances.capital)}</p></div>
          <div><p className="text-stone-500">The business owes you</p><p className="text-lg font-semibold">{fmt(balances.owed_to)}</p></div>
          <div><p className="text-stone-500">You owe the business</p><p className="text-lg font-semibold">{fmt(balances.owed_by)}</p></div>
          <div><p className="text-stone-500">Drawings</p><p className="text-lg font-semibold">{fmt(balances.drawings)}</p></div>
        </div>
        {recent.length > 0 && (
          <div className="divide-y divide-stone-100 border-t border-stone-100 text-sm">
            {recent.map(({ transaction: t }) => (
              <div key={t.id} className="flex justify-between gap-3 py-1.5">
                <span>{fmtDate(t.transaction_date)} · {t.kind === "opening" ? "Brought forward" : t.kind_label}</span>
                <span className="font-mono">{fmt(t.amount)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-stone-500">Recorded by finance. If something looks wrong, ask them.</p>
      </Card>
    </section>
  );
}
