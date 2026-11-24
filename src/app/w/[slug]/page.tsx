"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { ComingUp } from "@/components/coming-up";
import { PeriodDashboard } from "@/components/period-dashboard";
import { SetupGuide } from "@/components/setup-guide";
import { TaskInsights } from "@/components/task-insights";
import { Badge, Button, Card, FormError, Modal, PageHeader, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useBankAccounts } from "@/lib/api/banking";
import { fmt } from "@/lib/format";
import { usePeriod } from "@/lib/period";
import { useWorkspace } from "@/lib/workspace";

/** Who can use each card: a card someone can't use is left out of their Overview and their choices. */
const CARD_PERM: Record<string, string | null> = {
  coming_up: null, period: "reports.view", accounts: "banking.view", money: "banking.view", tasks: null, inbox: "inbox.view", role: null,
};

export default function OverviewPage() {
  const { slug, context, can } = useWorkspace();
  const ws = context.workspace;
  const [customising, setCustomising] = useState(false);
  const layout = useQuery({
    queryKey: ["dashboard-layout", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/dashboard/layout/", { params: { path: { workspace: slug } } })),
  });
  const allowed = (key: string) => {
    const perm = CARD_PERM[key];
    if (key === "money" && context.limited_department) return false;
    return perm === null || perm === undefined || can(perm);
  };
  const cards = (layout.data?.cards ?? []).filter(allowed);

  return (
    <div className="w-full">
      <PageHeader title={ws.name} description={`You are signed in as ${context.role}.`} guide="getting-started"
        actions={<Button variant="secondary" onClick={() => setCustomising(true)}><SlidersHorizontal className="h-4 w-4" /> Customise</Button>} />

      <SetupGuide />

      {context.unclosed_years.length > 0 && can("fiscalyears.manage") && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {context.unclosed_years.join(", ")} {context.unclosed_years.length === 1 ? "has" : "have"} ended but {context.unclosed_years.length === 1 ? "is" : "are"} not closed yet.
          Everything still works; close the year once your accountant has finalised the books.{" "}
          <Link href={`/w/${slug}/accounting/years`} className="font-medium underline">Financial years</Link>
        </div>
      )}

      {layout.isLoading ? <Spinner /> : (
        <div className="space-y-8">
          {cards.map((key) => <OverviewCard key={key} card={key} />)}
          {cards.length === 0 && (
            <Card className="p-6 text-center text-sm text-stone-600">Your Overview is empty. Choose <b>Customise</b> to add what you want to see here.</Card>
          )}
        </div>
      )}

      {customising && layout.data && (
        <Customise current={layout.data.cards.filter(allowed)} available={layout.data.available.filter((c) => allowed(c.key))} onClose={() => setCustomising(false)} />
      )}
    </div>
  );
}

function OverviewCard({ card }: { card: string }) {
  const { slug, context } = useWorkspace();
  switch (card) {
    case "coming_up":
      return <ComingUp compact />;
    case "period":
      return context.limited_department ? (
        <Link href={`/w/${slug}/accounting/reports/by-department`} className="block rounded-lg border border-stone-200 bg-white p-4 text-sm hover:border-brand-300">
          <span className="font-medium text-stone-900">{context.limited_department.name}: profit and loss</span>
          <span className="mt-1 block text-stone-600">You see {context.limited_department.name}&apos;s documents and reports. Open its profit and loss &rarr;</span>
        </Link>
      ) : <PeriodDashboard />;
    case "accounts":
      return <AccountsCard />;
    case "money":
      return <MoneyCard />;
    case "tasks":
      return <TaskInsights compact />;
    case "inbox":
      return <InboxCard />;
    case "role":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-stone-900">Your role</h2>
            <p className="mt-2 text-sm text-stone-700">{context.role}</p>
            {context.department && <p className="mt-1 text-sm text-stone-500">Department: {context.department}</p>}
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-stone-900">You are in charge of</h2>
            {context.in_charge_of.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">{context.in_charge_of.map((m) => <Badge key={m} tone="green">{m}</Badge>)}</div>
            ) : <p className="mt-2 text-sm text-stone-500">No modules. Department heads are in charge of the modules their department runs.</p>}
          </Card>
        </div>
      );
    default:
      return null;
  }
}

/** Each bank, M-Pesa and cash account with what's in it now. */
function AccountsCard() {
  const { slug } = useWorkspace();
  const q = useBankAccounts(slug);
  const rows = (q.data?.results ?? []).filter((a) => a.is_active);
  const total = rows.reduce((s, a) => s + Number(a.balance), 0);
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-stone-900">Cash and bank</h2>
        <Link href={`/w/${slug}/banking`} className="text-xs font-medium text-brand-700 hover:underline">All accounts &rarr;</Link>
      </div>
      {q.isLoading ? <Spinner /> : (
        <>
          <p className="mt-2 font-mono text-2xl font-semibold text-stone-900">{fmt(total)}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((a) => (
              <Link key={a.id} href={`/w/${slug}/banking/accounts/${a.id}`} className="flex items-center justify-between rounded-md border border-stone-100 px-3 py-2 text-sm hover:border-brand-300">
                <span className="truncate text-stone-700">{a.name}{a.below_minimum && <span className="ml-1.5 text-xs text-red-600">below minimum</span>}</span><span className={`font-mono ${Number(a.balance) < 0 || a.below_minimum ? "text-red-600" : "text-stone-900"}`}>{fmt(a.balance)}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

/** Money in and out for the chosen year or month, with the biggest sources and uses. */
function MoneyCard() {
  const { slug } = useWorkspace();
  const { from, to, label } = usePeriod();
  const q = useQuery({
    queryKey: ["money-movements", slug, from, to, "", ""],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/bank-accounts/movements/", { params: { path: { workspace: slug }, query: { from, to } } })),
  });
  const d = q.data;
  const sum = (k: "money_in" | "money_out") => (d?.accounts ?? []).reduce((s, a) => s + Number(a[k]), 0) - Number(d?.transfers ?? 0);
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-stone-900">Money in and out · {label}</h2>
        <Link href={`/w/${slug}/banking/money`} className="text-xs font-medium text-brand-700 hover:underline">Every movement &rarr;</Link>
      </div>
      {q.isLoading || !d ? <Spinner /> : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {([["Came in", sum("money_in"), d.came_from, "text-emerald-700"], ["Went out", sum("money_out"), d.went_to, "text-red-700"]] as const).map(([title, total, rows, tone]) => (
            <div key={title}>
              <p className="text-xs text-stone-500">{title}</p>
              <p className={`font-mono text-xl font-semibold ${tone}`}>{fmt(total)}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {rows.slice(0, 4).map((g) => <li key={g.name} className="flex justify-between gap-2"><span className="truncate text-stone-600">{g.name}</span><span className="font-mono text-stone-900">{fmt(g.amount)}</span></li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function InboxCard() {
  const { slug, context } = useWorkspace();
  return (
    <Link href={`/w/${slug}/inbox`} className="block">
      <Card className="flex items-center justify-between p-5 hover:border-brand-300">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Business inbox</h2>
          <p className="text-sm text-stone-600">Documents from other businesses waiting for you</p>
        </div>
        <span className="font-mono text-2xl font-semibold text-stone-900">{context.inbox_new}</span>
      </Card>
    </Link>
  );
}

function Customise({ current, available, onClose }: { current: string[]; available: { key: string; label: string }[]; onClose: () => void }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const [cards, setCards] = useState(current);
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PUT("/api/v1/w/{workspace}/dashboard/layout/", { params: { path: { workspace: slug } }, body: { cards } as never })),
    onSuccess: () => { toast.success("Overview saved"); void qc.invalidateQueries({ queryKey: ["dashboard-layout", slug] }); onClose(); },
  });
  const label = (k: string) => available.find((c) => c.key === k)?.label ?? k;
  const move = (i: number, by: number) => setCards((c) => { const n = [...c]; [n[i], n[i + by]] = [n[i + by], n[i]]; return n; });
  const off = available.filter((c) => !cards.includes(c.key));
  return (
    <Modal open title="Customise your Overview" onClose={onClose}>
      <div className="space-y-4 text-sm">
        <p className="text-stone-600">Choose what you see and in what order. It changes only your Overview, not anyone else&apos;s.</p>
        <ul className="divide-y divide-stone-100 rounded-md border border-stone-200">
          {cards.map((k, i) => (
            <li key={k} className="flex items-center gap-2 px-3 py-2">
              <span className="flex-1 text-stone-800">{label(k)}</span>
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-stone-500 hover:bg-stone-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" aria-label="Move down" disabled={i === cards.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-stone-500 hover:bg-stone-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
              <button type="button" onClick={() => setCards((c) => c.filter((x) => x !== k))} className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">Remove</button>
            </li>
          ))}
          {cards.length === 0 && <li className="px-3 py-2 text-stone-500">Nothing yet.</li>}
        </ul>
        {off.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Add</p>
            <div className="flex flex-wrap gap-2">
              {off.map((c) => <button key={c.key} type="button" onClick={() => setCards((x) => [...x, c.key])} className="rounded-full border border-stone-200 px-3 py-1.5 text-stone-700 hover:border-brand-500 hover:text-brand-700">+ {c.label}</button>)}
            </div>
          </div>
        )}
        <FormError error={save.error} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={save.isPending} onClick={() => save.mutate()}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
