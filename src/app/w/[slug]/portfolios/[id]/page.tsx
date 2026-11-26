"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import clsx from "clsx";
import { FolderClosed, FolderOpen, Plus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useState } from "react";

import { ActionMenu } from "@/components/action-menu";
import { ask } from "@/components/confirm";
import { PartyLink } from "@/components/party-link";
import { MakeInvoice, PortfolioDocuments, Repricing } from "@/components/portfolio-parts";
import { GroupForm, ServiceRows } from "@/components/portfolio-services";
import { ServiceForm } from "@/components/portfolio-service-form";
import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useAssignees } from "@/lib/api/crm";
import { fmt, fmtDate } from "@/lib/format";
import { DATE_KIND, type PortfolioDetail, type PortfolioGroup, type PortfolioService } from "@/lib/portfolios";
import { useWorkspace } from "@/lib/workspace";

const TABS = [["groups", "Groups"], ["services", "Services"], ["dates", "Dates ahead"], ["repricing", "What if"], ["documents", "Documents"], ["work", "Tasks and notes"], ["history", "History"], ["invoices", "Invoices"]] as const;

/** One client's account: every service, what it earns and costs, the dates that matter, documents, work and history. */
export default function PortfolioPage() {
  const { id } = useParams<{ id: string }>();
  const { slug, can } = useWorkspace();
  const router = useRouter();
  const qc = useQueryClient();
  const key = ["portfolio", slug, id];
  const q = useQuery({ queryKey: key, queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/portfolios/{id}/", { params: { path: { workspace: slug, id } } })) });
  const saved = (d: PortfolioDetail) => qc.setQueryData(key, d);
  const asked = useSearchParams().get("tab");
  const [tab, setTab] = useState<(typeof TABS)[number][0]>(TABS.some(([k]) => k === asked) ? asked as (typeof TABS)[number][0] : "services");
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
            {d.can_manage && <Button onClick={() => setGroup(null)}><Plus className="h-4 w-4" /> New group</Button>}
            <ActionMenu actions={[
              { label: "Make the month's invoice", onClick: () => setInvoicing(true), hidden: !(d.can_manage && can("invoices.create")) },
              { label: "Add a service", onClick: () => { setAddTo(""); setEditing(null); }, hidden: !d.can_manage },
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

      {tab === "groups" && (
        <Card>
          {d.groups.length === 0 ? (
            <EmptyState title="No groups yet">
              <p className="text-sm text-stone-500">A group is a folder for some of the client&apos;s services, such as an app with its hosting and support, or a branch.</p>
              {d.can_manage ? <Button className="mt-2" onClick={() => setGroup(null)}><Plus className="h-4 w-4" /> New group</Button> : undefined}
            </EmptyState>
          ) : (
            <Table head={["Group", "Services", "A month", "Costs you a month", "Margin", ""]}>
              {d.groups.map((gr) => (
                <tr key={gr.id} className="hover:bg-stone-50">
                  <Td>
                    <Link className="flex items-start gap-1.5 font-medium text-brand-700 hover:underline" href={`/w/${slug}/portfolios/${id}/groups/${gr.id}`}>
                      <FolderClosed className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />{gr.name}
                    </Link>
                    {gr.notes && <span className="block pl-5 text-xs text-stone-500">{gr.notes}</span>}
                  </Td>
                  <Td>{gr.services}</Td>
                  <Td className="text-right font-mono">{fmt(gr.monthly_revenue)}</Td>
                  <Td className="text-right font-mono">{fmt(gr.monthly_cost)}</Td>
                  <Td className={clsx("text-right font-mono", gr.loses_money && "text-red-700")}>{fmt(gr.monthly_margin)}{gr.margin_percent != null && <span className="block text-xs">{Number(gr.margin_percent).toFixed(0)}%</span>}</Td>
                  <Td className="text-right">
                    {d.can_manage && (
                      <span className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs">
                        <button type="button" className="text-brand-700 hover:underline" onClick={() => { setAddTo(gr.id); setEditing(null); }}>Add a service here</button>
                        <button type="button" className="text-brand-700 hover:underline" onClick={() => setGroup(gr)}>Change</button>
                        <button type="button" className="text-brand-700 hover:underline" disabled={copyGroup.isPending} onClick={() => copyGroup.mutate(gr)}>Duplicate</button>
                      </span>
                    )}
                  </Td>
                </tr>
              ))}
              {d.services.some((s) => !s.group_id) && (
                <tr>
                  <Td className="text-stone-500">No group</Td>
                  <Td className="text-stone-500">{d.services.filter((s) => !s.group_id).length}</Td>
                  <Td colSpan={4} className="text-xs text-stone-500">See them on <button type="button" className="text-brand-700 hover:underline" onClick={() => setTab("services")}>Services</button>. Move one into a group from its panel.</Td>
                </tr>
              )}
            </Table>
          )}
        </Card>
      )}

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
                          <span className="flex items-start gap-1.5">
                            <button type="button" title={closed ? "Show its services" : "Fold its services away"} onClick={() => toggle(gr.id)} aria-expanded={!closed}>
                              {closed ? <FolderClosed className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" /> : <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />}
                            </button>
                            <span>
                              <Link className="font-semibold text-stone-900 hover:underline" href={`/w/${slug}/portfolios/${id}/groups/${gr.id}`}>{gr.name}</Link>
                              <span className="block text-xs text-stone-500">{gr.services} {gr.services === 1 ? "service" : "services"}{gr.notes ? ` · ${gr.notes}` : ""}{closed ? " · folded" : ""}</span>
                            </span>
                          </span>
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
                  {!closed && <ServiceRows rows={rows} d={d} indent={!!gr} onEdit={setEditing} onSaved={saved} />}
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

