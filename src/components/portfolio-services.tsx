"use client";

import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import clsx from "clsx";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import { Fragment, useState } from "react";

import { ask } from "@/components/confirm";
import { AppsEditor, CostLinks } from "@/components/portfolio-parts";
import { Badge, Button, Field, FormError, Input, Modal, Select, Td, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import type { PortfolioDetail, PortfolioGroup, PortfolioService } from "@/lib/portfolios";
import { useWorkspace } from "@/lib/workspace";

/** Service rows for a 7-column table (Service, They pay, A month, Costs you a month, Margin, Next dates, ""); click one to open its panel. */
export function ServiceRows({ rows, d, indent = false, onEdit, onSaved }: {
  rows: PortfolioService[]; d: PortfolioDetail; indent?: boolean; onEdit: (s: PortfolioService) => void; onSaved: (p: PortfolioDetail) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      {rows.map((s) => (
    <Fragment key={s.id}>
      <tr className={clsx("cursor-pointer hover:bg-stone-50", s.status !== "active" && "opacity-60")} onClick={() => setOpen(open === s.id ? null : s.id)}>
        <Td>
          <span className={clsx("flex items-center gap-1 font-medium", indent && "pl-4")}>{open === s.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{s.name}</span>
          <span className={clsx("block pl-5 text-xs text-stone-500", indent && "pl-9")}>{s.kind_label}{s.status !== "active" ? ` · ${s.status_label}` : ""}{s.supplier_name ? ` · from ${s.supplier_name}` : ""}</span>
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
          <ServicePanel s={s} d={d} onEdit={() => onEdit(s)} onSaved={onSaved} />
        </Td></tr>
      )}
    </Fragment>
      ))}
    </>
  );
}

export function ServicePanel({ s, d, onEdit, onSaved }: { s: PortfolioService; d: PortfolioDetail; onEdit: () => void; onSaved: (p: PortfolioDetail) => void }) {
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

/** A group is a folder for some of the client's services: a name and a note. Deleting it keeps the services, with no group. */
export function GroupForm({ portfolioId, group, onClose, onSaved, onDeleted }: {
  portfolioId: string; group: PortfolioGroup | null; onClose: () => void; onSaved: (p: PortfolioDetail) => void; onDeleted?: () => void;
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
    onSuccess: (p) => { onSaved(p); onClose(); onDeleted?.(); },
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
