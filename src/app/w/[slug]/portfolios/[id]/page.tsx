"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import clsx from "clsx";
import { ChevronDown, ChevronRight, Copy, FolderClosed, FolderOpen, Plus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Fragment, useState } from "react";

import { ActionMenu } from "@/components/action-menu";
import { ask } from "@/components/confirm";
import { PartyLink } from "@/components/party-link";
import { AppsEditor, CostLinks, MakeInvoice, PortfolioDocuments, Repricing } from "@/components/portfolio-parts";
import { ServiceForm } from "@/components/portfolio-service-form";
import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useAssignees } from "@/lib/api/crm";
import { fmt, fmtDate } from "@/lib/format";
import { DATE_KIND, type PortfolioDetail, type PortfolioGroup, type PortfolioService } from "@/lib/portfolios";
import { useWorkspace } from "@/lib/workspace";

const TABS = [["services", "Services"], ["dates", "Dates ahead"], ["repricing", "What if"], ["documents", "Documents"], ["work", "Tasks and notes"], ["history", "History"], ["invoices", "Invoices"]] as const;

/** One client's account: every service, what it earns and costs, the dates that matter, documents, work and history. */
export default function PortfolioPage() {
  const { id } = useParams<{ id: string }>();
  const { slug, can } = useWorkspace();
  const router = useRouter();
  const qc = useQueryClient();
  const key = ["portfolio", slug, id];
  const q = useQuery({ queryKey: key, queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/portfolios/{id}/", { params: { path: { workspace: slug, id } } })) });
  const saved = (d: PortfolioDetail) => qc.setQueryData(key, d);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("services");
  const [editing, setEditing] = useState<PortfolioService | null | undefined>(undefined);
  const [addTo, setAddTo] = useState("");  // the group a new service goes in
  const [group, setGroup] = useState<PortfolioGroup | null | undefined>(undefined);
  const [shut, setShut] = useState<Set<string>>(new Set());  // collapsed groups
  const toggle = (gid: string) => setShut((s) => { const n = new Set(s); if (n.has(gid)) n.delete(gid); else n.add(gid); return n; });
  const copyGroup = useMutation({
    mutationFn: async (g: PortfolioGroup) => unwrap(await api.POST("/api/v1/w/{workspace}/portfolios/groups/{id}/duplicate/", { params: { path: { workspace: slug, id: g.id } }, body: {} })),
    onSuccess: (r, g) => { saved(r); toast.success(`${g.name} copied with its services. Rename it and change what differs.`); },
    onError: (e) => toast.error(e.message),
  });
  const [open, setOpen] = useState<string | null>(null);
  const [invoicing, setInvoicing] = useState(false);
  const [settings, setSettings] = useState(false);
  const remove = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/w/{workspace}/portfolios/{id}/", { params: { path: { workspace: slug, id } } })),
    onSuccess: () => router.push(`/w/${slug}/portfolios`),
  });
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} />;
  const d = q.data;
  const losing = d.services.filter((s) => s.loses_money || s.apps.some((a) => a.loses_money));
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/portfolios`} className="text-sm text-stone-500 hover:underline">&larr; Client portfolios</Link>
      <PageHeader title={d.customer_name} guide="client-portfolios"
        description={<><PartyLink kind="customer" id={d.customer_id} name="Customer record" /> · {d.lead_name ? `Lead: ${d.lead_name}` : "No lead yet"} · standard margin {Number(d.target_margin)}%</>}
        actions={
          <div className="flex flex-wrap gap-2">
            {d.can_manage && can("invoices.create") && <Button onClick={() => setInvoicing(true)}>Make the month&apos;s invoice</Button>}
            <ActionMenu actions={[
              { label: "Add a service", onClick: () => setEditing(null), hidden: !d.can_manage },
              { label: "Portfolio report (print or PDF)", href: `/w/${slug}/portfolios/${id}/report` },
              { label: "Lead, margin and notes", onClick: () => setSettings(true), hidden: !d.can_manage },
              { label: "Delete the portfolio", danger: true, hidden: !can("portfolios.manage"),
                onClick: () => void ask("Delete this portfolio with its services, documents and history? The customer and their invoices stay.").then((ok) => ok && remove.mutate()) },
            ]} />
          </div>
        } />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <Stat label="Revenue a month" value={fmt(d.monthly_revenue)} />
        <Stat label="Cost a month" value={fmt(d.monthly_cost)} />
        <Stat label="Margin a month" value={`${fmt(d.monthly_margin)}${d.margin_percent != null ? ` (${Number(d.margin_percent).toFixed(0)}%)` : ""}`} bad={Number(d.monthly_margin) < 0} />
        <Stat label="Revenue a year" value={fmt(d.yearly_revenue)} />
        <Stat label="Margin a year" value={fmt(d.yearly_margin)} bad={Number(d.yearly_margin) < 0} />
        <Stat label={`Gap to ${Number(d.target_margin)}% margin`} value={`${Number(d.repricing_gap) > 0 ? "+" : ""}${fmt(d.repricing_gap)}`} bad={Number(d.repricing_gap) > 0} />
      </div>
      {losing.length > 0 && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900">
          Losing money: {losing.map((s) => s.name).join(", ")}. See <button className="underline" onClick={() => setTab("repricing")}>What if</button> for what they should cost.
        </p>
      )}

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-stone-200">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={clsx("shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm", tab === k ? "border-brand-700 font-medium text-brand-800" : "border-transparent text-stone-500 hover:text-stone-800")}>
            {l}{k === "dates" && d.dates.length > 0 && <span className="ml-1 rounded-full bg-amber-100 px-1.5 text-xs text-amber-900">{d.dates.length}</span>}
          </button>
        ))}
      </div>

      {tab === "services" && (
        <Card>
          {d.services.length === 0 && d.groups.length === 0 ? (
            <EmptyState title="No services yet">{d.can_manage ? <Button className="mt-2" onClick={() => { setAddTo(""); setEditing(null); }}><Plus className="h-4 w-4" /> Add a service</Button> : undefined}</EmptyState>
          ) : (
            <Table head={["Service", "They pay", "A month", "Costs you a month", "Margin", "Next dates", ""]}>
              {[...d.groups.map((gr) => ({ gr, rows: d.services.filter((s) => s.group_id === gr.id) })),
                { gr: null, rows: d.services.filter((s) => !s.group_id) }]
                .filter((g) => g.gr || g.rows.length).map(({ gr, rows }) => {
                const closed = gr ? shut.has(gr.id) : false;
                return (
                <Fragment key={gr?.id ?? "none"}>
                  {(gr || d.groups.length > 0) && (
                    <tr className="bg-stone-100/70">
                      <Td colSpan={2}>
                        {gr ? (
                          <button type="button" className="flex items-start gap-1.5 text-left" onClick={() => toggle(gr.id)} aria-expanded={!closed}>
                            {closed ? <FolderClosed className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" /> : <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />}
                            <span>
                              <span className="font-semibold text-stone-900">{gr.name}</span>
                              <span className="block text-xs text-stone-500">{gr.services} {gr.services === 1 ? "service" : "services"}{gr.notes ? ` · ${gr.notes}` : ""}{closed ? " · click to open" : ""}</span>
                            </span>
                          </button>
                        ) : <span className="font-semibold text-stone-900">No group</span>}
                      </Td>
                      <Td className="text-right font-mono font-semibold">{gr ? fmt(gr.monthly_revenue) : ""}</Td>
                      <Td className="text-right font-mono">{gr ? fmt(gr.monthly_cost) : ""}</Td>
                      <Td className={clsx("text-right font-mono", gr?.loses_money && "text-red-700")}>{gr ? fmt(gr.monthly_margin) : ""}{gr?.margin_percent != null && <span className="block text-xs">{Number(gr.margin_percent).toFixed(0)}%</span>}</Td>
                      <Td colSpan={2} className="text-right">
                        {gr && d.can_manage && (
                          <span className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs">
                            <button type="button" className="text-brand-700 hover:underline" onClick={() => { setAddTo(gr.id); setEditing(null); }}>Add a service here</button>
                            <button type="button" className="text-brand-700 hover:underline" onClick={() => setGroup(gr)}>Change</button>
                            <button type="button" className="text-brand-700 hover:underline" disabled={copyGroup.isPending} onClick={() => copyGroup.mutate(gr)}>Duplicate</button>
                          </span>
                        )}
                      </Td>
                    </tr>
                  )}
                  {gr && !closed && rows.length === 0 && (
                    <tr><Td colSpan={7} className="pl-8 text-sm text-stone-500">No services in this group yet.{d.can_manage && <> <button type="button" className="text-brand-700 hover:underline" onClick={() => { setAddTo(gr.id); setEditing(null); }}>Add one</button>, or move one here from its Change panel.</>}</Td></tr>
                  )}
                  {!closed && rows.map((s) => (
                <Fragment key={s.id}>
                  <tr className={clsx("cursor-pointer hover:bg-stone-50", s.status !== "active" && "opacity-60")} onClick={() => setOpen(open === s.id ? null : s.id)}>
                    <Td>
                      <span className={clsx("flex items-center gap-1 font-medium", gr && "pl-4")}>{open === s.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{s.name}</span>
                      <span className={clsx("block pl-5 text-xs text-stone-500", gr && "pl-9")}>{s.kind_label}{s.status !== "active" ? ` · ${s.status_label}` : ""}{s.supplier_name ? ` · from ${s.supplier_name}` : ""}</span>
                    </Td>
                    <Td className="text-right font-mono">{fmt(s.per_cycle)}<span className="block text-xs text-stone-500">{s.billing_cycle_label.toLowerCase()}</span></Td>
                    <Td className="text-right font-mono">{s.billing_cycle === "one_off" ? "-" : fmt(s.monthly_revenue)}</Td>
                    <Td className="text-right font-mono">{fmt(s.monthly_cost)}{s.monthly_cost_actual != null && <span className="block text-xs text-stone-500">from bills</span>}</Td>
                    <Td className={clsx("text-right font-mono", s.loses_money && "text-red-700")}>{s.billing_cycle === "one_off" ? "-" : fmt(s.monthly_margin)}{s.margin_percent != null && <span className="block text-xs">{Number(s.margin_percent).toFixed(0)}%</span>}</Td>
                    <Td className="text-xs">
                      {s.next_bill_date && <span className="block">Bill {fmtDate(s.next_bill_date)}</span>}
                      {s.supplier_renewal_date && <span className="block text-amber-800">Renew {fmtDate(s.supplier_renewal_date)}</span>}
                      {s.contract_end && <span className="block text-stone-500">Ends {fmtDate(s.contract_end)}</span>}
                    </Td>
                    <Td className="text-right">{s.loses_money && <Badge tone="red">Loses money</Badge>}</Td>
                  </tr>
                  {open === s.id && (
                    <tr><Td colSpan={7} className="bg-stone-50">
                      <ServicePanel s={s} d={d} onEdit={() => setEditing(s)} onSaved={saved} />
                    </Td></tr>
                  )}
                </Fragment>
                  ))}
                </Fragment>
                );
              })}
            </Table>
          )}
          {d.can_manage && (
            <div className="flex flex-wrap gap-2 p-3">
              {(d.services.length > 0 || d.groups.length > 0) && <Button variant="secondary" onClick={() => { setAddTo(""); setEditing(null); }}><Plus className="h-4 w-4" /> Add a service</Button>}
              <Button variant="secondary" onClick={() => setGroup(null)}><Plus className="h-4 w-4" /> New group</Button>
              <span className="self-center text-xs text-stone-500">A group is a folder for some of the client&apos;s services, such as an app with its hosting and support.</span>
            </div>
          )}
        </Card>
      )}

      {tab === "dates" && (
        <Card>
          {d.dates.length === 0 ? <EmptyState title="Nothing in the next 90 days" /> : (
            <Table head={["Date", "What", "Amount"]}>
              {d.dates.map((x, i) => (
                <tr key={i}>
                  <Td className={clsx(x.overdue && "text-red-700")}>{fmtDate(x.date)}{x.overdue && <span className="block text-xs">Overdue</span>}</Td>
                  <Td><Badge tone={DATE_KIND[x.kind].tone}>{DATE_KIND[x.kind].label}</Badge> <span className="ml-1">{x.label}</span></Td>
                  <Td className="text-right font-mono">{x.amount != null ? fmt(x.amount) : ""}</Td>
                </tr>
              ))}
            </Table>
          )}
          <p className="p-3 text-xs text-stone-500">The lead is reminded before each date (Remind days on the service) and they also show on Coming up and the Overview.</p>
        </Card>
      )}

      {tab === "repricing" && <Card><Repricing data={d} /></Card>}
      {tab === "documents" && <Card><PortfolioDocuments data={d} onSaved={saved} /></Card>}

      {tab === "work" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2"><h2 className="text-sm font-semibold">Open tasks for this client</h2>
              <Link className="text-sm text-brand-700 hover:underline" href={`/w/${slug}/tasks`}>All tasks</Link></div>
            {d.tasks.length === 0 ? <p className="p-4 text-sm text-stone-500">None open. Give a task and choose this customer on it.</p> : (
              <ul className="divide-y divide-stone-100">
                {d.tasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 px-4 py-2 text-sm">
                    <Link className="text-brand-700 hover:underline" href={`/w/${slug}/tasks/${t.id}`}>{t.title}</Link>
                    <span className="ml-auto text-xs text-stone-500">{t.who}{t.due_date ? ` · due ${fmtDate(t.due_date)}` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2"><h2 className="text-sm font-semibold">Calls, meetings and notes</h2>
              <Link className="text-sm text-brand-700 hover:underline" href={`/w/${slug}/sales/customers/${d.customer_id}`}>Add one on the customer</Link></div>
            {d.activities.length === 0 ? <p className="p-4 text-sm text-stone-500">Nothing logged yet.</p> : (
              <ul className="divide-y divide-stone-100">
                {d.activities.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 px-4 py-2 text-sm"><Badge>{a.kind}</Badge><span>{a.subject}</span><span className="ml-auto text-xs text-stone-500">{fmtDate(a.created_at)}</span></li>
                ))}
              </ul>
            )}
          </Card>
          {d.notes && <Card className="p-4 lg:col-span-2"><h2 className="mb-1 text-sm font-semibold">Notes</h2><p className="whitespace-pre-line text-sm">{d.notes}</p></Card>}
        </div>
      )}

      {tab === "history" && (
        <Card>
          {d.history.length === 0 ? <EmptyState title="No changes yet" /> : (
            <Table head={["Date", "What", "Change", "Why", "By"]}>
              {d.history.map((h) => (
                <tr key={h.id}>
                  <Td>{fmtDate(h.changed_on)}</Td>
                  <Td>{h.what}</Td>
                  <Td className="text-sm">{h.field === "added" ? `Added at ${h.new_value}` : h.field === "removed" ? "Removed" : <>{h.field}: <span className="font-mono">{h.old_value || "-"}</span> to <span className="font-mono">{h.new_value || "-"}</span></>}</Td>
                  <Td className="text-sm text-stone-600">{h.reason || "-"}</Td>
                  <Td className="text-sm">{h.by}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {tab === "invoices" && (
        <Card>
          {d.recurring_invoices.length > 0 && (
            <p className="m-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              This client also has a recurring invoice ({d.recurring_invoices.map((r) => <Link key={r.id} className="underline" href={`/w/${slug}/sales/recurring-invoices/${r.id}`}>{r.name}</Link>)}). Stop it once the portfolio bills the same services, so nothing is billed twice.
            </p>
          )}
          {d.invoices.length === 0 ? <EmptyState title="No invoices made from the portfolio yet" /> : (
            <Table head={["Month", "Invoice", "Status", "Total"]}>
              {d.invoices.map((b) => (
                <tr key={b.month}>
                  <Td>{new Date(b.month).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</Td>
                  <Td>{b.invoice_id ? <Link className="font-mono text-xs text-brand-700 hover:underline" href={`/w/${slug}/sales/invoices/${b.invoice_id}`}>{b.number || "Draft"}</Link> : "Deleted"}</Td>
                  <Td>{b.status}</Td>
                  <Td className="text-right font-mono">{fmt(b.total)}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {editing !== undefined && <ServiceForm key={editing?.id ?? `new-${addTo}`} portfolioId={id} service={editing} open onClose={() => setEditing(undefined)} onSaved={saved}
        groups={d.groups} groupId={addTo} />}
      {group !== undefined && <GroupForm key={group?.id ?? "new"} portfolioId={id} group={group} onClose={() => setGroup(undefined)} onSaved={saved} />}
      {invoicing && <MakeInvoice data={d} open onClose={() => setInvoicing(false)} />}
      {settings && <SettingsModal d={d} onClose={() => setSettings(false)} onSaved={saved} />}
    </div>
  );
}

function ServicePanel({ s, d, onEdit, onSaved }: { s: PortfolioService; d: PortfolioDetail; onEdit: () => void; onSaved: (p: PortfolioDetail) => void }) {
  return (
    <div className="space-y-4 py-2">
      <div className="flex flex-wrap items-start gap-6 text-sm">
        <div><p className="text-xs text-stone-500">Client side</p><p>{Number(s.quantity)} × {fmt(s.price)} {s.billing_cycle_label.toLowerCase()}{s.product_name ? ` · as ${s.product_name}` : ""}</p>
          {(s.contract_start || s.contract_end) && <p className="text-stone-600">Contract {s.contract_start ? fmtDate(s.contract_start) : "?"} to {s.contract_end ? fmtDate(s.contract_end) : "open"}</p>}</div>
        <div><p className="text-xs text-stone-500">Your side</p><p>{fmt(s.cost)} {s.cost_cycle_label.toLowerCase()}{s.supplier_name ? ` to ${s.supplier_name}` : ""}</p>
          <p className="text-stone-600">Estimate {fmt(s.monthly_cost_estimate)} a month{s.monthly_cost_actual != null ? `, actual ${fmt(s.monthly_cost_actual)}` : ""}</p></div>
        {s.fair_per_cycle != null && <div><p className="text-xs text-stone-500">At {Number(d.target_margin)}% margin</p><p className="font-mono">{fmt(s.fair_per_cycle)} {s.billing_cycle_label.toLowerCase()}</p></div>}
        {s.prepaid && (
          <div className="min-w-52">
            <p className="text-xs text-stone-500">Prepaid {s.prepaid_from && fmtDate(s.prepaid_from)} to {s.prepaid_to && fmtDate(s.prepaid_to)}</p>
            <div className="my-1 h-2 overflow-hidden rounded bg-stone-200"><div className="h-2 bg-brand-600" style={{ width: `${Math.min(100, Number(s.prepaid.total) ? (Number(s.prepaid.earned) / Number(s.prepaid.total)) * 100 : 0)}%` }} /></div>
            <p>Earned {fmt(s.prepaid.earned)} · left {fmt(s.prepaid.left)} ({s.prepaid.days_left} days)</p>
          </div>
        )}
        {d.can_manage && <Button variant="secondary" className="ml-auto" onClick={onEdit}>Change</Button>}
      </div>
      {s.notes && <p className="whitespace-pre-line text-sm text-stone-600">{s.notes}</p>}
      {(s.kind === "hosting" || s.apps.length > 0) && (
        <div><p className="mb-2 text-sm font-medium">Apps and their resources (a month)</p><AppsEditor service={s} manage={d.can_manage} margin={Number(d.target_margin)} onSaved={onSaved} /></div>
      )}
      <CostLinks service={s} manage={d.can_manage} onSaved={onSaved} />
      {d.can_manage && <MoveAndCopy s={s} d={d} onSaved={onSaved} />}
      <DeleteService s={s} manage={d.can_manage} onSaved={onSaved} />
    </div>
  );
}

/** Move to group, and Duplicate: a copy (prices, dates, supplier, apps and resources) to change from. */
function MoveAndCopy({ s, d, onSaved }: { s: PortfolioService; d: PortfolioDetail; onSaved: (p: PortfolioDetail) => void }) {
  const { slug } = useWorkspace();
  const path = { params: { path: { workspace: slug, id: s.id } } };
  const move = useMutation({
    mutationFn: async (gid: string) => unwrap(await api.PATCH("/api/v1/w/{workspace}/portfolios/services/{id}/", { ...path, body: { group_id: gid || null } })),
    onSuccess: (r, gid) => { onSaved(r); toast.success(gid ? `Moved to ${d.groups.find((g) => g.id === gid)?.name}` : "Now in no group"); },
    onError: (e) => toast.error(e.message),
  });
  const copy = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/portfolios/services/{id}/duplicate/", { ...path, body: {} })),
    onSuccess: (r) => { onSaved(r); toast.success(`${s.name} (copy) added. Open it and change what differs.`); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="flex flex-wrap items-end gap-3 border-t border-stone-200 pt-3" onClick={(e) => e.stopPropagation()}>
      {d.groups.length > 0 && (
        <Field label="Move to group">
          <Select className="w-56" value={s.group_id ?? ""} disabled={move.isPending} onChange={(e) => move.mutate(e.target.value)}>
            <option value="">No group</option>
            {d.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </Select>
        </Field>
      )}
      <Button variant="secondary" loading={copy.isPending} onClick={() => copy.mutate()}><Copy className="h-4 w-4" /> Duplicate</Button>
      <span className="self-center text-xs text-stone-500">Duplicate copies the prices, dates, supplier and apps, in the same group.</span>
    </div>
  );
}

function DeleteService({ s, manage, onSaved }: { s: PortfolioService; manage: boolean; onSaved: (p: PortfolioDetail) => void }) {
  const { slug } = useWorkspace();
  const remove = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/w/{workspace}/portfolios/services/{id}/", { params: { path: { workspace: slug, id: s.id } } })),
    onSuccess: onSaved,
  });
  if (!manage) return null;
  return (
    <div className="text-right">
      <FormError error={remove.error} />
      <Button variant="ghost" className="text-red-600" onClick={() => void ask(`Remove ${s.name}? To keep its history, set it to Ended instead.`).then((ok) => ok && remove.mutate())}>Remove the service</Button>
    </div>
  );
}

function SettingsModal({ d, onClose, onSaved }: { d: PortfolioDetail; onClose: () => void; onSaved: (p: PortfolioDetail) => void }) {
  const { slug, can } = useWorkspace();
  const people = useAssignees(slug);
  const [f, setF] = useState({ lead_id: d.lead_id ?? "", target_margin: String(Number(d.target_margin)), notes: d.notes });
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PATCH("/api/v1/w/{workspace}/portfolios/{id}/", {
      params: { path: { workspace: slug, id: d.id } },
      body: { ...(can("portfolios.manage") ? { lead_id: f.lead_id || null } : {}), target_margin: f.target_margin, notes: f.notes } as never,
    })),
    onSuccess: (p) => { onSaved(p); onClose(); },
  });
  return (
    <Modal open title="Lead, margin and notes" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        {can("portfolios.manage") && (
          <Field label="Portfolio lead"><Select value={f.lead_id} onChange={(e) => setF({ ...f, lead_id: e.target.value })}><option value="">No one</option>{people.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</Select></Field>
        )}
        <Field label="Standard margin (%)"><Input type="number" inputMode="decimal" min="0" max="95" step="0.5" value={f.target_margin} onChange={(e) => setF({ ...f, target_margin: e.target.value })} /></Field>
        <Field label="Notes"><Textarea rows={4} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
      </form>
    </Modal>
  );
}

function Stat({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className={clsx("font-mono text-base", bad && "text-red-700")}>{value}</p>
    </Card>
  );
}

/** A group is a folder for some of the client's services: a name and a note. Deleting it keeps the services, with no group. */
function GroupForm({ portfolioId, group, onClose, onSaved }: {
  portfolioId: string; group: PortfolioGroup | null; onClose: () => void; onSaved: (p: PortfolioDetail) => void;
}) {
  const { slug } = useWorkspace();
  const [f, setF] = useState({ name: group?.name ?? "", notes: group?.notes ?? "" });
  const save = useMutation({
    mutationFn: async () => group
      ? unwrap(await api.PATCH("/api/v1/w/{workspace}/portfolios/groups/{id}/", { params: { path: { workspace: slug, id: group.id } }, body: f }))
      : unwrap(await api.POST("/api/v1/w/{workspace}/portfolios/{id}/groups/", { params: { path: { workspace: slug, id: portfolioId } }, body: f })),
    onSuccess: (p) => { onSaved(p); onClose(); },
  });
  const remove = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/w/{workspace}/portfolios/groups/{id}/", { params: { path: { workspace: slug, id: group!.id } } })),
    onSuccess: (p) => { onSaved(p); onClose(); },
  });
  return (
    <Modal open title={group ? `Change ${group.name}` : "New group"} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Field label="Group"><Input required maxLength={160} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Members app" /></Field>
        <Field label="Note (optional)"><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="e.g. The app, its hosting and support" /></Field>
        <FormError error={save.error ?? remove.error} />
        <div className="flex flex-wrap justify-between gap-2">
          {group ? <Button type="button" variant="secondary" loading={remove.isPending}
            onClick={async () => { if (await ask(`Delete the group ${group.name}? Its services stay, with no group.`, { confirmLabel: "Delete group", danger: true })) remove.mutate(); }}>Delete</Button> : <span />}
          <div className="flex gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>{group ? "Save" : "Add the group"}</Button></div>
        </div>
      </form>
    </Modal>
  );
}
