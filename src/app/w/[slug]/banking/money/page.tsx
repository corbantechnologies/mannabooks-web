"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Card, EmptyState, ErrorState, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { usePeriod } from "@/lib/period";
import { useWorkspace } from "@/lib/workspace";

const KIND: Record<string, string> = { bank: "Bank", mobile: "Mobile money", cash: "Cash" };

/** The state of the money for the chosen year or month: each account, where money came from and went to, and every movement. */
export default function MoneyPage() {
  const { slug, context } = useWorkspace();
  const { from, to, label } = usePeriod();
  const [account, setAccount] = useState("");
  const [direction, setDirection] = useState("");
  const q = useQuery({
    queryKey: ["money-movements", slug, from, to, account, direction],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/bank-accounts/movements/", {
      params: { path: { workspace: slug }, query: { from, to, bank_account: account || undefined, direction: (direction || undefined) as never } },
    })),
  });
  const cur = context.workspace.currency;
  const d = q.data;
  const sum = (k: "opening" | "money_in" | "money_out" | "closing") => (d?.accounts ?? []).reduce((s, a) => s + Number(a[k]), 0);
  const moneyIn = sum("money_in") - Number(d?.transfers ?? 0);
  const moneyOut = sum("money_out") - Number(d?.transfers ?? 0);

  return (
    <div className="w-full space-y-5">
      <PageHeader title="Money in and out" guide="banking"
        description={`Every shilling into and out of your bank, M-Pesa and cash accounts in ${label}, however it was recorded. Change the year or month at the top.`} />
      {q.isLoading ? <Spinner /> : q.error ? <ErrorState error={q.error} /> : d && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="At the start" value={sum("opening")} cur={cur} />
            <Stat label="Came in" value={moneyIn} cur={cur} tone="in" />
            <Stat label="Went out" value={moneyOut} cur={cur} tone="out" />
            <Stat label="At the end" value={sum("closing")} cur={cur} note={`${moneyIn - moneyOut >= 0 ? "Up" : "Down"} ${fmt(Math.abs(moneyIn - moneyOut))}`} />
          </div>

          <Card>
            <Table head={["Account", "At the start", "In", "Out", "At the end"]}>
              {d.accounts.map((a) => (
                <tr key={a.bank_account_id}>
                  <Td><Link className="font-medium hover:underline" href={`/w/${slug}/banking/accounts/${a.bank_account_id}`}>{a.name}</Link>
                    <span className="block text-xs text-stone-500">{KIND[a.kind] ?? a.kind}</span></Td>
                  <Td className="text-right font-mono">{fmt(a.opening)}</Td>
                  <Td className="text-right font-mono text-emerald-700">{fmt(a.money_in)}</Td>
                  <Td className="text-right font-mono text-red-700">{fmt(a.money_out)}</Td>
                  <Td className={`text-right font-mono font-semibold ${Number(a.closing) < 0 ? "text-red-600" : ""}`}>{fmt(a.closing)}</Td>
                </tr>
              ))}
            </Table>
            {Number(d.transfers) > 0 && <p className="border-t border-stone-100 px-4 py-2 text-xs text-stone-500">In and out per account include {fmt(d.transfers)} moved between your own accounts; the totals above leave it out.</p>}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Groups title="Where it came from" rows={d.came_from} total={moneyIn} tone="in" />
            <Groups title="Where it went" rows={d.went_to} total={moneyOut} tone="out" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link href={`/w/${slug}/sales/invoices`}><Card className="p-4 hover:border-brand-600"><p className="text-sm text-stone-500">Customers still owe you</p><p className="text-xl font-semibold">{cur} {fmt(d.customers_owe)}</p><p className="text-xs text-stone-500">At the end of {label}: money still to come in</p></Card></Link>
            <Link href={`/w/${slug}/purchasing/bills`}><Card className="p-4 hover:border-brand-600"><p className="text-sm text-stone-500">You still owe suppliers</p><p className="text-xl font-semibold">{cur} {fmt(d.owed_to_suppliers)}</p><p className="text-xs text-stone-500">At the end of {label}: money still to go out</p></Card></Link>
          </div>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Every movement</h2>
              <div className="flex flex-wrap gap-2">
                <div className="w-48"><Select aria-label="Account" value={account} onChange={(e) => setAccount(e.target.value)}>
                  <option value="">Every account</option>{d.accounts.map((a) => <option key={a.bank_account_id} value={a.bank_account_id}>{a.name}</option>)}
                </Select></div>
                <div className="w-36"><Select aria-label="In or out" value={direction} onChange={(e) => setDirection(e.target.value)}>
                  <option value="">In and out</option><option value="in">Money in</option><option value="out">Money out</option>
                </Select></div>
              </div>
            </div>
            <Card>
              {d.rows.length === 0 ? <EmptyState title="No money moved in this period" /> : (
                <Table head={["Date", "What", "Account", "From / to", "In", "Out"]}>
                  {d.rows.map((r, i) => (
                    <tr key={`${r.entry_id}-${i}`}>
                      <Td className="whitespace-nowrap">{fmtDate(r.date)}</Td>
                      <Td><Link className="hover:underline" href={`/w/${slug}/accounting/journals/${r.entry_id}`}>{r.description || r.number}</Link>
                        <span className="block text-xs text-stone-500">{[r.number, r.reference].filter(Boolean).join(" · ")}</span></Td>
                      <Td>{r.bank_account_name}</Td>
                      <Td className="text-stone-600">{r.other_side || "-"}</Td>
                      <Td className="text-right font-mono text-emerald-700">{r.money_in ? fmt(r.money_in) : ""}</Td>
                      <Td className="text-right font-mono text-red-700">{r.money_out ? fmt(r.money_out) : ""}</Td>
                    </tr>
                  ))}
                </Table>
              )}
              {d.truncated && <p className="border-t border-stone-100 px-4 py-2 text-xs text-amber-700">Showing the latest 2,000. Choose a month at the top to see the rest.</p>}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, cur, tone, note }: { label: string; value: number; cur?: string; tone?: "in" | "out"; note?: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-stone-500">{label}</p>
      <p className={`text-2xl font-semibold ${tone === "in" ? "text-emerald-700" : tone === "out" ? "text-red-700" : value < 0 ? "text-red-600" : ""}`}>{fmt(value)}</p>
      <p className="text-xs text-stone-500">{note ?? cur}</p>
    </Card>
  );
}

function Groups({ title, rows, total, tone }: { title: string; rows: { name: string; amount: string }[]; total: number; tone: "in" | "out" }) {
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? <p className="text-sm text-stone-500">Nothing in this period.</p> : (
        <ul className="space-y-2">
          {rows.map((g) => {
            const pct = total > 0 ? Math.min(100, (Number(g.amount) / total) * 100) : 0;
            return (
              <li key={g.name}>
                <div className="flex justify-between gap-2 text-sm"><span className="truncate">{g.name}</span><span className="font-mono">{fmt(g.amount)}</span></div>
                <div className="mt-1 h-1.5 rounded bg-stone-100"><div className={`h-1.5 rounded ${tone === "in" ? "bg-emerald-500" : "bg-red-400"}`} style={{ width: `${pct}%` }} /></div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
