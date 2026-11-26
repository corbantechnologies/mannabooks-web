"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import toast from "react-hot-toast";

import { ask } from "@/components/confirm";
import { Badge, Button, Field, FormError, Input, Modal, Select, Table, Td } from "@/components/ui";
import { downloadFile, sendForm } from "@/lib/api/assets";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { DOC_KINDS, type PortfolioApp, type PortfolioDetail, type PortfolioResource, type PortfolioService, RESOURCE_KINDS, fairAt } from "@/lib/portfolios";
import { useWorkspace } from "@/lib/workspace";

type Saved = (p: PortfolioDetail) => void;
const p = (workspace: string, id: string) => ({ params: { path: { workspace, id } } });

/** Apps under a hosting service, each with its resources: your cost and the client's price per unit, per month. */
export function AppsEditor({ service, manage, margin, onSaved }: { service: PortfolioService; manage: boolean; margin: number; onSaved: Saved }) {
  const { slug } = useWorkspace();
  const [name, setName] = useState("");
  const add = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/portfolios/services/{id}/apps/", { ...p(slug, service.id), body: { name } as never })),
    onSuccess: (d) => { setName(""); onSaved(d); }, onError: (e) => toast.error(e.message),
  });
  return (
    <div className="space-y-3">
      {service.apps.map((a) => <AppCard key={a.id} app={a} manage={manage} margin={margin} onSaved={onSaved} />)}
      {manage && (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) add.mutate(); }}>
          <Input className="max-w-xs" placeholder="App or site name, e.g. Members portal" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" variant="secondary" loading={add.isPending}><Plus className="h-4 w-4" /> Add an app</Button>
        </form>
      )}
    </div>
  );
}

function AppCard({ app, manage, margin, onSaved }: { app: PortfolioApp; manage: boolean; margin: number; onSaved: Saved }) {
  const { slug } = useWorkspace();
  const patch = useMutation({
    mutationFn: async (body: Record<string, unknown>) => unwrap(await api.PATCH("/api/v1/w/{workspace}/portfolios/apps/{id}/", { ...p(slug, app.id), body: body as never })),
    onSuccess: onSaved, onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/w/{workspace}/portfolios/apps/{id}/", p(slug, app.id))),
    onSuccess: onSaved, onError: (e) => toast.error(e.message),
  });
  const addRes = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/portfolios/apps/{id}/resources/", { ...p(slug, app.id), body: { kind: "vcpu" } as never })),
    onSuccess: onSaved, onError: (e) => toast.error(e.message),
  });
  const fair = fairAt(Number(app.monthly_cost), margin);
  return (
    <div className={clsx("rounded-md border p-3", app.loses_money ? "border-red-200 bg-red-50/40" : "border-stone-200", !app.is_active && "opacity-60")}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-medium">{app.name}</span>
        {!app.is_active && <Badge>Switched off</Badge>}
        {app.loses_money && <Badge tone="red">Loses money</Badge>}
        <span className="text-sm text-stone-600">
          {fmt(app.monthly_price)} a month · costs {fmt(app.monthly_cost)}{app.monthly_cost_actual != null && ` (actual ${fmt(app.monthly_cost_actual)})`} · margin {fmt(app.monthly_margin)}
          {app.margin_percent != null && ` (${Number(app.margin_percent).toFixed(0)}%)`}
          {fair != null && app.is_active && <> · at {margin}%: <span className="font-mono">{fmt(fair)}</span></>}
        </span>
        {manage && (
          <span className="ml-auto flex gap-1">
            <Button variant="ghost" onClick={() => patch.mutate({ is_active: !app.is_active })}>{app.is_active ? "Switch off" : "Switch on"}</Button>
            <Button variant="ghost" className="text-red-600" onClick={() => void ask(`Remove ${app.name} and its resources?`).then((ok) => ok && remove.mutate())}><Trash2 className="h-4 w-4" /></Button>
          </span>
        )}
      </div>
      {app.resources.length > 0 && (
        <Table head={["Resource", "Unit", "Quantity", "Your cost each", "Their price each", "Cost", "Price", ""]}>
          {app.resources.map((r) => <ResourceRow key={r.id} r={r} manage={manage} onSaved={onSaved} />)}
        </Table>
      )}
      {manage && <Button variant="ghost" className="mt-2" loading={addRes.isPending} onClick={() => addRes.mutate()}><Plus className="h-4 w-4" /> Add a resource</Button>}
    </div>
  );
}

function ResourceRow({ r, manage, onSaved }: { r: PortfolioResource; manage: boolean; onSaved: Saved }) {
  const { slug } = useWorkspace();
  const start = { kind: r.kind, label: r.label, unit: r.unit, quantity: String(Number(r.quantity)), unit_cost: String(Number(r.unit_cost)), unit_price: String(Number(r.unit_price)) };
  const [f, setF] = useState(start);
  const [reason, setReason] = useState("");
  const dirty = JSON.stringify(f) !== JSON.stringify(start);
  const money = f.unit_cost !== start.unit_cost || f.unit_price !== start.unit_price || f.quantity !== start.quantity;
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PATCH("/api/v1/w/{workspace}/portfolios/resources/{id}/", { ...p(slug, r.id), body: { ...f, reason } as never })),
    onSuccess: (d) => { setReason(""); onSaved(d); }, onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/w/{workspace}/portfolios/resources/{id}/", p(slug, r.id))),
    onSuccess: onSaved, onError: (e) => toast.error(e.message),
  });
  if (!manage) {
    return (
      <tr><Td>{r.label || r.kind_label}</Td><Td>{r.unit}</Td><Td className="text-right font-mono">{Number(r.quantity)}</Td><Td className="text-right font-mono">{fmt(r.unit_cost)}</Td>
        <Td className="text-right font-mono">{fmt(r.unit_price)}</Td><Td className="text-right font-mono">{fmt(r.monthly_cost)}</Td><Td className="text-right font-mono">{fmt(r.monthly_price)}</Td><Td /></tr>
    );
  }
  const num = "w-24 py-1 text-right text-sm";
  return (
    <>
      <tr>
        <Td>
          <div className="flex gap-1">
            <Select aria-label="Resource" className="w-28 py-1 text-sm" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as typeof f.kind })}>{RESOURCE_KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
            <Input aria-label="Label" className="w-32 py-1 text-sm" placeholder="Label" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
          </div>
        </Td>
        <Td><Input aria-label="Unit" className="w-20 py-1 text-sm" placeholder="GB" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></Td>
        <Td><Input aria-label="Quantity" type="number" inputMode="decimal" min="0" step="any" className={num} value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></Td>
        <Td><Input aria-label="Your cost each" type="number" inputMode="decimal" min="0" step="any" className={num} value={f.unit_cost} onChange={(e) => setF({ ...f, unit_cost: e.target.value })} /></Td>
        <Td><Input aria-label="Their price each" type="number" inputMode="decimal" min="0" step="any" className={num} value={f.unit_price} onChange={(e) => setF({ ...f, unit_price: e.target.value })} /></Td>
        <Td className="text-right font-mono">{fmt(Number(f.quantity) * Number(f.unit_cost))}</Td>
        <Td className={clsx("text-right font-mono", Number(f.unit_price) < Number(f.unit_cost) && "text-red-700")}>{fmt(Number(f.quantity) * Number(f.unit_price))}</Td>
        <Td className="whitespace-nowrap text-right">
          {dirty && <Button variant="secondary" loading={save.isPending} onClick={() => save.mutate()}>Save</Button>}
          <Button variant="ghost" className="text-red-600" aria-label="Remove" onClick={() => remove.mutate()}><Trash2 className="h-4 w-4" /></Button>
        </Td>
      </tr>
      {dirty && money && r.monthly_price !== "0.00" && (
        <tr><Td colSpan={8}><Input className="py-1 text-sm" placeholder="Why the change? (kept in the history)" value={reason} onChange={(e) => setReason(e.target.value)} /></Td></tr>
      )}
    </>
  );
}

/** Real supplier bills (or part of one) put against a service or one of its apps: actual costs instead of estimates. */
export function CostLinks({ service, manage, onSaved }: { service: PortfolioService; manage: boolean; onSaved: Saved }) {
  const { slug, can } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ bill_id: "", amount: "", month: new Date().toISOString().slice(0, 7) + "-01", app_id: "", note: "" });
  const bills = useQuery({
    queryKey: ["bills", slug, "for-costs", service.supplier_id], enabled: open,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/bills/", { params: { path: { workspace: slug }, query: { supplier: service.supplier_id || undefined, page_size: 100 } as never } })),
  });
  const add = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/portfolios/services/{id}/costs/", { ...p(slug, service.id), body: { ...f, app_id: f.app_id || null } as never })),
    onSuccess: (d) => { setOpen(false); onSaved(d); },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await api.DELETE("/api/v1/w/{workspace}/portfolios/costs/{id}/", p(slug, id))),
    onSuccess: onSaved, onError: (e) => toast.error(e.message),
  });
  const appName = (id?: string | null) => service.apps.find((a) => a.id === id)?.name;
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-sm font-medium">Actual costs from supplier bills</span>
        {manage && can("bills.view") && <Button variant="ghost" onClick={() => { add.reset(); setOpen(true); }}><Plus className="h-4 w-4" /> Link a bill</Button>}
      </div>
      {service.costs.length === 0 ? <p className="text-sm text-stone-500">None linked: the margin uses the cost typed above.</p> : (
        <ul className="divide-y divide-stone-100 text-sm">
          {service.costs.map((c) => (
            <li key={c.id} className="flex items-center gap-2 py-1">
              <span className="w-24 text-stone-500">{new Date(c.month).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span>
              <Link className="font-mono text-xs text-brand-700 hover:underline" href={`/w/${slug}/purchasing/bills/${c.bill_id}`}>{c.bill_number}</Link>
              {appName(c.app_id) && <span className="text-stone-600">for {appName(c.app_id)}</span>}
              {c.note && <span className="text-stone-500">{c.note}</span>}
              <span className="ml-auto font-mono">{fmt(c.amount)}</span>
              {manage && <button type="button" aria-label="Remove" className="text-stone-400 hover:text-red-600" onClick={() => remove.mutate(c.id)}><Trash2 className="h-4 w-4" /></button>}
            </li>
          ))}
        </ul>
      )}
      <Modal open={open} title={`Link a supplier bill to ${service.name}`} onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
          <Field label="Bill" hint={service.supplier_name ? `Bills from ${service.supplier_name}` : "Choose the supplier on the service to narrow this list"}>
            <Select required value={f.bill_id} onChange={(e) => setF({ ...f, bill_id: e.target.value })}>
              <option value="">Choose a bill</option>
              {(bills.data?.results ?? []).filter((b) => b.status !== "draft" && b.status !== "void").map((b) => (
                <option key={b.id} value={b.id}>{b.supplier_invoice_number} · {b.supplier_name} · {fmtDate(b.bill_date)} · {fmt(b.subtotal)}</option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Amount for this service" hint="Before VAT. Split one bill across several services or apps."><Input required type="number" inputMode="decimal" min="0.01" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
            <Field label="For the month of"><Input required type="month" value={f.month.slice(0, 7)} onChange={(e) => setF({ ...f, month: `${e.target.value}-01` })} /></Field>
          </div>
          {service.apps.length > 0 && (
            <Field label="App">
              <Select value={f.app_id} onChange={(e) => setF({ ...f, app_id: e.target.value })}><option value="">The whole service</option>{service.apps.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
            </Field>
          )}
          <Field label="Note"><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
          <FormError error={add.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={add.isPending}>Link it</Button></div>
        </form>
      </Modal>
    </div>
  );
}

/** Contracts, agreements and SLAs, on the portfolio or one service, with an expiry date. */
export function PortfolioDocuments({ data, onSaved }: { data: PortfolioDetail; onSaved: Saved }) {
  const { slug } = useWorkspace();
  const input = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ title: "", kind: "contract", service_id: "", expires_on: "" });
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const upload = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("file", file as File);
      form.append("title", f.title);
      form.append("kind", f.kind);
      if (f.service_id) form.append("service_id", f.service_id);
      if (f.expires_on) form.append("expires_on", f.expires_on);
      return sendForm<PortfolioDetail>(`/api/v1/w/${slug}/portfolios/${data.id}/documents/`, form);
    },
    onSuccess: (d) => { setOpen(false); setFile(null); setF({ title: "", kind: "contract", service_id: "", expires_on: "" }); onSaved(d); toast.success("Document added"); },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await api.DELETE("/api/v1/w/{workspace}/portfolios/documents/{id}/", p(slug, id))),
    onSuccess: onSaved, onError: (e) => toast.error(e.message),
  });
  const svc = (id?: string | null) => data.services.find((s) => s.id === id)?.name;
  return (
    <div>
      {data.documents.length === 0 ? <p className="p-4 text-sm text-stone-500">No contracts or agreements yet.</p> : (
        <Table head={["Document", "For", "Expires", ""]}>
          {data.documents.map((d) => (
            <tr key={d.id}>
              <Td>
                <button type="button" className="text-left text-brand-700 hover:underline" onClick={() => void downloadFile(`/api/v1/w/${slug}/portfolios/documents/${d.id}/`, d.name).catch((e) => toast.error(e.message))}>{d.title}</button>
                <span className="block text-xs text-stone-500">{d.kind_label} · {d.name}</span>
              </Td>
              <Td>{svc(d.service_id) ?? "The whole portfolio"}</Td>
              <Td>{d.expires_on ? <>{fmtDate(d.expires_on)} {d.expiring && <Badge tone="red">Expires soon</Badge>}</> : <span className="text-stone-400">No expiry</span>}</Td>
              <Td className="text-right">{data.can_manage && <button type="button" aria-label="Remove" className="text-stone-400 hover:text-red-600" onClick={() => void ask(`Remove ${d.title}?`).then((ok) => ok && remove.mutate(d.id))}><Trash2 className="h-4 w-4" /></button>}</Td>
            </tr>
          ))}
        </Table>
      )}
      {data.can_manage && <div className="p-3"><Button variant="secondary" onClick={() => { upload.reset(); setOpen(true); }}><Plus className="h-4 w-4" /> Add a document</Button></div>}
      <Modal open={open} title="Add a contract or agreement" onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (file) upload.mutate(); }}>
          <Field label="Title"><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Hosting SLA 2026" /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kind"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{DOC_KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
            <Field label="Expires on" hint="You are reminded 30 days before"><Input type="date" value={f.expires_on} onChange={(e) => setF({ ...f, expires_on: e.target.value })} /></Field>
          </div>
          <Field label="For">
            <Select value={f.service_id} onChange={(e) => setF({ ...f, service_id: e.target.value })}><option value="">The whole portfolio</option>{data.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
          </Field>
          <Field label="File">
            <input ref={input} type="file" className="block w-full text-sm" accept="image/*,application/pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          <FormError error={upload.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={!file} loading={upload.isPending}>Add it</Button></div>
        </form>
      </Modal>
    </div>
  );
}

/** "Make this month's invoice": a preview of the lines due, then a draft invoice. */
export function MakeInvoice({ data, open, onClose }: { data: PortfolioDetail; open: boolean; onClose: () => void }) {
  const { slug } = useWorkspace();
  const router = useRouter();
  const [month, setMonth] = useState(data.today.slice(0, 7));
  const [byGroup, setByGroup] = useState(Boolean(data.invoice_by_group));
  const preview = useQuery({
    queryKey: ["portfolio-invoice", slug, data.id, month, byGroup], enabled: open,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/portfolios/{id}/invoice/", { params: { path: { workspace: slug, id: data.id }, query: { month: `${month}-01`, by_group: byGroup } } })),
  });
  const make = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/portfolios/{id}/invoice/", { ...p(slug, data.id), body: { month: `${month}-01`, by_group: byGroup } })),
    onSuccess: (r) => router.push(`/w/${slug}/sales/invoices/${r.invoice_id}`),
  });
  const pv = preview.data;
  return (
    <Modal open={open} title="Make the month's invoice" onClose={onClose} size="lg">
      <div className="space-y-3">
        <Field label="Month" hint="Everything due by the end of this month: one billing cycle per service, a line per app for hosting."><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
        {data.groups.length > 0 && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={byGroup} onChange={(e) => setByGroup(e.target.checked)} />
            <span>Group the lines by group<span className="block text-xs text-stone-500">Each line starts with its group&apos;s name, group by group. Remembered for this client.</span></span>
          </label>
        )}
        {pv?.already && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">This month is already invoiced: <Link className="font-mono underline" href={`/w/${slug}/sales/invoices/${pv.already.invoice_id}`}>{pv.already.number}</Link>.</p>}
        {pv?.warning && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">{pv.warning}</p>}
        {pv && (pv.lines.length === 0 ? <p className="text-sm text-stone-500">Nothing is due to bill by the end of this month.</p> : (
          <Table head={["Line", "Quantity", "Price", "Amount"]}>
            {pv.lines.map((l, i) => (
              <tr key={i}><Td>{l.description}</Td><Td className="text-right font-mono">{Number(l.quantity)}</Td><Td className="text-right font-mono">{fmt(l.unit_price)}</Td><Td className="text-right font-mono">{fmt(l.amount)}</Td></tr>
            ))}
            <tr className="font-medium"><Td colSpan={3}>Before VAT</Td><Td className="text-right font-mono">{fmt(pv.total)}</Td></tr>
          </Table>
        ))}
        <FormError error={make.error} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={!pv || pv.lines.length === 0 || !!pv.already} loading={make.isPending} onClick={() => make.mutate()}>Make the draft invoice</Button>
        </div>
      </div>
    </Modal>
  );
}

/** What if: what each service would cost the client at a margin you pick, against what they pay now. */
export function Repricing({ data }: { data: PortfolioDetail }) {
  const [margin, setMargin] = useState(String(Number(data.target_margin)));
  const m = Number(margin) || 0;
  const rows = data.services.filter((s) => s.status === "active" && s.billing_cycle !== "one_off");
  const now = rows.reduce((t, s) => t + Number(s.monthly_revenue), 0);
  const fair = rows.reduce((t, s) => t + (fairAt(Number(s.monthly_cost), m) ?? 0), 0);
  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="At a margin of (%)"><Input className="w-28" type="number" inputMode="decimal" min="0" max="95" step="1" value={margin} onChange={(e) => setMargin(e.target.value)} /></Field>
        <p className="pb-2 text-sm text-stone-600">
          They pay <span className="font-mono">{fmt(now)}</span> a month. At {m}% they would pay <span className="font-mono">{fmt(fair)}</span>:{" "}
          <span className={clsx("font-mono font-medium", fair > now ? "text-red-700" : "text-green-700")}>{fair > now ? "+" : ""}{fmt(fair - now)}</span> a month.
        </p>
      </div>
      <Table head={["Service", "Costs you a month", "They pay a month", `At ${m}%`, "Difference"]}>
        {rows.map((s) => {
          const f = fairAt(Number(s.monthly_cost), m) ?? 0;
          const gap = f - Number(s.monthly_revenue);
          return (
            <tr key={s.id}>
              <Td>{s.name}</Td>
              <Td className="text-right font-mono">{fmt(s.monthly_cost)}</Td>
              <Td className="text-right font-mono">{fmt(s.monthly_revenue)}</Td>
              <Td className="text-right font-mono">{fmt(f)}</Td>
              <Td className={clsx("text-right font-mono", gap > 0.005 ? "text-red-700" : "text-green-700")}>{gap > 0 ? "+" : ""}{fmt(gap)}</Td>
            </tr>
          );
        })}
      </Table>
      <p className="text-xs text-stone-500">A red difference means the client pays less than your margin needs. Nothing changes until you change a price.</p>
    </div>
  );
}
