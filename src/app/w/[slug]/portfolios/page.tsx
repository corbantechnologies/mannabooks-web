"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useAssignees } from "@/lib/api/crm";
import { useCustomers } from "@/lib/api/sales";
import { fmt } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

/** Every client's account: what you provide them, what it earns, what it costs you, and what's due. */
export default function PortfoliosPage() {
  const { slug, can } = useWorkspace();
  const router = useRouter();
  const all = can("portfolios.view");
  const [mine, setMine] = useState(!all);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ customer_id: "", lead_id: "", target_margin: "30" });
  const customers = useCustomers(slug);
  const people = useAssignees(slug);
  const list = useQuery({
    queryKey: ["portfolios", slug, mine, search],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/portfolios/", { params: { path: { workspace: slug }, query: { mine: mine || undefined, search: search || undefined } } })),
  });
  const create = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/portfolios/", {
      ...wsPath(slug), body: { customer_id: f.customer_id, lead_id: f.lead_id || null, target_margin: f.target_margin } as never,
    })),
    onSuccess: (p) => router.push(`/w/${slug}/portfolios/${p.id}`),
  });
  const rows = list.data ?? [];
  const sum = (k: "monthly_revenue" | "monthly_cost" | "monthly_margin") => rows.reduce((t, r) => t + Number(r[k]), 0);
  return (
    <div className="w-full">
      <PageHeader title="Client portfolios" guide="client-portfolios"
        description="Everything you provide each client: the services, what they pay, what each costs you, the margin, and the dates to bill them and renew with your suppliers."
        actions={can("portfolios.manage") ? <Button onClick={() => { create.reset(); setAdding(true); }}><Plus className="h-4 w-4" /> New portfolio</Button> : undefined} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {all && (
          <div className="flex gap-1 border-b border-stone-200">
            {[{ k: false, l: "All clients" }, { k: true, l: "My portfolios" }].map((t) => (
              <button key={t.l} onClick={() => setMine(t.k)}
                className={clsx("border-b-2 px-3 py-2 text-sm", mine === t.k ? "border-brand-700 font-medium text-brand-800" : "border-transparent text-stone-500 hover:text-stone-800")}>{t.l}</button>
            ))}
          </div>
        )}
        <Input className="max-w-xs" placeholder="Find a client" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {rows.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Card className="p-4"><p className="text-xs text-stone-500">Revenue a month</p><p className="font-mono text-lg">{fmt(sum("monthly_revenue"))}</p></Card>
          <Card className="p-4"><p className="text-xs text-stone-500">Cost a month</p><p className="font-mono text-lg">{fmt(sum("monthly_cost"))}</p></Card>
          <Card className="p-4"><p className="text-xs text-stone-500">Margin a month</p><p className={clsx("font-mono text-lg", sum("monthly_margin") < 0 && "text-red-700")}>{fmt(sum("monthly_margin"))}</p></Card>
        </div>
      )}
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title={mine ? "You lead no portfolios yet" : "No portfolios yet"}>{can("portfolios.manage") ? "Start one with New portfolio, then add the client's services." : undefined}</EmptyState>
        ) : (
          <Table head={["Client", "Lead", "Services", "A month", "Cost", "Margin", ""]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50">
                <Td><Link href={`/w/${slug}/portfolios/${r.id}`} className="font-medium text-brand-700 hover:underline">{r.customer_name}</Link></Td>
                <Td>{r.lead_name || <span className="text-stone-400">No lead</span>}</Td>
                <Td>{r.services}</Td>
                <Td className="text-right font-mono">{fmt(r.monthly_revenue)}</Td>
                <Td className="text-right font-mono">{fmt(r.monthly_cost)}</Td>
                <Td className={clsx("text-right font-mono", Number(r.monthly_margin) < 0 && "text-red-700")}>{fmt(r.monthly_margin)}{r.margin_percent != null && <span className="block text-xs text-stone-500">{Number(r.margin_percent).toFixed(0)}%</span>}</Td>
                <Td className="space-x-1 text-right">
                  {r.losing > 0 && <Badge tone="red">{r.losing} losing money</Badge>}
                  {r.due_soon > 0 && <Badge tone="amber">{r.due_soon} due soon</Badge>}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={adding} title="New client portfolio" onClose={() => setAdding(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <Field label="Client">
            <Select required value={f.customer_id} onChange={(e) => setF({ ...f, customer_id: e.target.value })}>
              <option value="">Choose the client</option>
              {(customers.data?.results ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Portfolio lead" hint="The person in charge of this client. They see it under My portfolios and get its reminders.">
            <Select value={f.lead_id} onChange={(e) => setF({ ...f, lead_id: e.target.value })}>
              <option value="">No one yet</option>
              {people.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </Field>
          <Field label="Your standard margin (%)" hint="Used to work out what each service should cost the client.">
            <Input type="number" inputMode="decimal" min="0" max="95" step="0.5" value={f.target_margin} onChange={(e) => setF({ ...f, target_margin: e.target.value })} />
          </Field>
          <FormError error={create.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button type="submit" loading={create.isPending}>Start the portfolio</Button></div>
        </form>
      </Modal>
    </div>
  );
}
