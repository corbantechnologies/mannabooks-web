"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Plus, Search, Settings2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { ask } from "@/components/confirm";
import { AskAccess } from "@/components/register-ask";
import { AsPage, Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";
import { useFormItem } from "@/lib/page-form";

type Register = components["schemas"]["RegisterType"];
type Item = components["schemas"]["RegisterItem"];

/** Registers: what the business has and pays for, by kind. Everyone can look ("do we have it?") and ask for access. */
export default function RegistersPage() {
  const { slug, can } = useWorkspace();
  const router = useRouter();
  const sp = useSearchParams();
  const manage = can("registers.manage");
  const regs = useQuery({ queryKey: ["registers", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/registers/", wsPath(slug))) });
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [asking, setAsking] = useState<Item | null>(null);
  const list = regs.data ?? [];
  const [fieldsOf, setFields] = useFormItem(regs.data);
  const fields = fieldsOf === "new" ? null : fieldsOf;
  const current = sp.get("register") ?? (q ? "" : list.find((r) => r.is_active)?.id ?? "");
  const reg = list.find((r) => r.id === current);
  const items = useQuery({
    queryKey: ["register-items", slug, current, q], enabled: !!current || !!q,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/registers/items/", { params: { path: { workspace: slug }, query: { ...(current && !q ? { register: current } : {}), ...(q ? { q } : {}) } } })),
  });
  const requests = useQuery({ queryKey: ["register-requests", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/registers/requests/", wsPath(slug))) });
  if (regs.isLoading) return <Spinner />;
  if (regs.error) return <ErrorState error={regs.error} />;
  const d = items.data;
  if (fields) {
    return <AsPage guide="registers"><RegisterSettings reg={fields} onClose={() => setFields(null)} /></AsPage>;
  }
  return (
    <div className="w-full">
      <PageHeader title="Registers" guide="registers"
        description="What the business has and pays for: software and subscriptions, licences, insurance, vehicles and more. Everyone can look and ask for access; renewals are reminded and show in Coming up and the cash projection."
        actions={manage ? <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> New register</Button> : undefined} />
      {(requests.data ?? []).length > 0 && (
        <Card className="mb-4 border-amber-300">
          <h2 className="border-b border-stone-100 px-4 py-2 text-sm font-semibold">Asking for access ({requests.data!.length})</h2>
          <ul className="divide-y divide-stone-100">
            {requests.data!.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 px-4 py-2 text-sm">
                <span className="font-medium">{r.name}</span><span className="text-stone-600">asks for <Link className="text-brand-700 hover:underline" href={`/w/${slug}/registers/items/${r.item_id}`}>{r.item_name}</Link>: {r.reason}</span>
                <span className="ml-auto text-xs text-stone-500">{fmtDate(r.created_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {list.length === 0 ? (
        <Card><EmptyState title="No registers yet">{manage ? "Start one with New register: software and subscriptions is a good first." : "An admin sets them up."}</EmptyState></Card>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="flex gap-1 overflow-x-auto border-b border-stone-200">
              {list.filter((r) => r.is_active || manage).map((r) => (
                <button key={r.id} type="button" onClick={() => { setQ(""); router.replace(`/w/${slug}/registers?register=${r.id}`); }}
                  className={clsx("shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm", r.id === current && !q ? "border-brand-700 font-medium text-brand-800" : "border-transparent text-stone-500 hover:text-stone-800", !r.is_active && "line-through")}>
                  {r.name} <span className="text-xs text-stone-400">{r.items}</span>
                </button>
              ))}
            </div>
            <div className="relative ml-auto">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
              <Input className="w-64 pl-8" placeholder="Do we have...? Search every register" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          {reg && !q && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <p className="mr-auto text-sm text-stone-600">{reg.description}</p>
              {manage && <Button variant="secondary" onClick={() => setFields(reg)}><Settings2 className="h-4 w-4" /> Register settings</Button>}
              {manage && reg.is_active && <Link href={`/w/${slug}/registers/items/new?register=${reg.id}`}><Button><Plus className="h-4 w-4" /> Add</Button></Link>}
            </div>
          )}
          {d && d.money_shown && (
            <div className="mb-3 grid gap-3 sm:grid-cols-3">
              <Card className="p-3"><p className="text-xs text-stone-500">A month</p><p className="font-mono text-lg">{fmt(d.total_monthly)}</p></Card>
              <Card className="p-3"><p className="text-xs text-stone-500">A year</p><p className="font-mono text-lg">{fmt(d.total_yearly)}</p></Card>
              <Card className="p-3"><p className="text-xs text-stone-500">Renewing in 30 days</p><p className={clsx("font-mono text-lg", d.renewing_soon > 0 && "text-amber-700")}>{d.renewing_soon}</p></Card>
            </div>
          )}
          <Card>
            {items.isLoading ? <div className="p-4"><Spinner /></div> : !d?.items.length ? <EmptyState title={q ? `Nothing called “${q}”` : "Nothing here yet"}>{q ? "Ask whoever manages registers if the business has it." : undefined}</EmptyState> : (
              <Table head={["Name", ...(q ? ["Register"] : []), "Responsible", "Used by", ...(reg?.has_seats || q ? ["Seats"] : []), ...(d.money_shown ? ["A month"] : []), "Renews", ""]}>
                {d.items.map((i) => (
                  <tr key={i.id} className={clsx("cursor-pointer hover:bg-stone-50", i.status === "ended" && "opacity-60")} onClick={() => router.push(`/w/${slug}/registers/items/${i.id}`)}>
                    <Td className="font-medium">{i.name}{i.supplier_name && <span className="block text-xs font-normal text-stone-500">{i.supplier_name}</span>}</Td>
                    {q && <Td>{i.register_name}</Td>}
                    <Td>{i.owner_name || <span className="text-stone-400">-</span>}</Td>
                    <Td className="text-sm">{[...i.departments.map((x) => x.name), i.users.length ? `${i.users.length} ${i.users.length === 1 ? "person" : "people"}` : ""].filter(Boolean).join(", ") || "-"}</Td>
                    {(reg?.has_seats || q) && <Td className={clsx("text-right", i.seats !== null && i.seats_used >= i.seats && "text-amber-700")}>{i.seats !== null ? `${i.seats_used} of ${i.seats}` : i.seats_used || "-"}</Td>}
                    {d.money_shown && <Td className="text-right font-mono">{i.monthly_cost === null ? "" : fmt(i.monthly_cost)}</Td>}
                    <Td className={clsx("whitespace-nowrap", i.renews_in_days !== null && i.renews_in_days < 0 ? "text-red-700" : i.renews_in_days !== null && i.renews_in_days <= 30 ? "text-amber-700" : "")}>
                      {i.renewal_date ? fmtDate(i.renewal_date) : "-"}{i.renews_in_days !== null && i.renews_in_days < 0 && <span className="block text-xs">overdue</span>}
                    </Td>
                    <Td className="text-right" onClick={(e) => e.stopPropagation()}>
                      {i.i_use_it ? <Badge tone="green">You have it</Badge> : i.i_asked ? <Badge tone="amber">Asked</Badge>
                        : i.status === "active" && <button type="button" className="text-xs text-brand-700 hover:underline" onClick={() => setAsking(i)}>Ask for access</button>}
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </>
      )}
      {adding && <NewRegister onClose={() => setAdding(false)} />}
      {asking && <AskAccess item={asking} onClose={() => setAsking(null)} />}
    </div>
  );
}

function NewRegister({ onClose }: { onClose: () => void }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const router = useRouter();
  const presets = useQuery({ queryKey: ["register-presets", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/registers/presets/", wsPath(slug))) });
  const [preset, setPreset] = useState("");
  const [name, setName] = useState("");
  const make = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/registers/", { ...wsPath(slug), body: { preset: preset as never, name } })),
    onSuccess: (r) => { void qc.invalidateQueries({ queryKey: ["registers", slug] }); router.replace(`/w/${slug}/registers?register=${r.id}`); onClose(); },
  });
  const p = (presets.data ?? []).find((x) => x.key === preset);
  return (
    <Modal open title="New register" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); make.mutate(); }}>
        <Field label="Start from">
          <Select value={preset} onChange={(e) => setPreset(e.target.value)}>
            <option value="">Nothing: my own register</option>
            {(presets.data ?? []).map((x) => <option key={x.key} value={x.key} disabled={x.added}>{x.name}{x.added ? " (already added)" : ""}</option>)}
          </Select>
        </Field>
        {p && <p className="text-sm text-stone-600">{p.description}</p>}
        <Field label="Name" hint={preset ? "Blank: the preset's name" : undefined}><Input maxLength={80} required={!preset} value={name} onChange={(e) => setName(e.target.value)} placeholder={p?.name ?? "e.g. Keys and access cards"} /></Field>
        <FormError error={make.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={make.isPending}>Add the register</Button></div>
      </form>
    </Modal>
  );
}

/** A register's name, description, seats and up to eight fields of its own. */
function RegisterSettings({ reg, onClose }: { reg: Register; onClose: () => void }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const router = useRouter();
  const [f, setF] = useState({ name: reg.name, description: reg.description ?? "", has_seats: reg.has_seats ?? false, is_active: reg.is_active ?? true });
  const [rows, setRows] = useState((reg.fields ?? []).map((x) => ({ key: x.key ?? "", label: x.label, kind: x.kind, options: (x.options ?? []).join(", ") })));
  const done = () => { void qc.invalidateQueries({ queryKey: ["registers", slug] }); onClose(); };
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PATCH("/api/v1/w/{workspace}/registers/{id}/", {
      params: { path: { workspace: slug, id: reg.id } },
      body: { ...f, fields: rows.filter((r) => r.label.trim()).map((r) => ({ key: r.key, label: r.label, kind: r.kind, ...(r.kind === "choice" ? { options: r.options.split(",").map((o) => o.trim()).filter(Boolean) } : {}) })) },
    })),
    onSuccess: () => { toast.success("Saved"); done(); },
  });
  const remove = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/w/{workspace}/registers/{id}/", { params: { path: { workspace: slug, id: reg.id } } })),
    onSuccess: () => { router.replace(`/w/${slug}/registers`); done(); },
  });
  return (
    <Modal open title={`${reg.name}: settings`} onClose={onClose} size="lg">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name"><Input required maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Status"><Select value={f.is_active ? "on" : "off"} onChange={(e) => setF({ ...f, is_active: e.target.value === "on" })}><option value="on">In use</option><option value="off">Switched off (items kept)</option></Select></Field>
        </div>
        <Field label="Description"><Textarea rows={2} maxLength={255} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.has_seats} onChange={(e) => setF({ ...f, has_seats: e.target.checked })} /> Items have seats (logins, licences)</label>
        <div>
          <p className="mb-1 text-sm font-medium">Its own fields (at most eight)</p>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <Input className="w-56" placeholder="Field name" maxLength={60} value={r.label} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <Select className="w-32" value={r.kind} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, kind: e.target.value as typeof r.kind } : x)))}>
                  <option value="text">Text</option><option value="number">Number</option><option value="date">Date</option><option value="choice">Choice</option>
                </Select>
                {r.kind === "choice" && <Input className="w-56" placeholder="Choices, comma separated" value={r.options} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, options: e.target.value } : x)))} />}
                <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => setRows(rows.filter((_, j) => j !== i))}>Remove</button>
              </div>
            ))}
            {rows.length < 8 && <button type="button" className="text-sm text-brand-700 hover:underline" onClick={() => setRows([...rows, { key: "", label: "", kind: "text", options: "" }])}>+ Add a field</button>}
          </div>
        </div>
        <FormError error={save.error ?? remove.error} />
        <div className="flex flex-wrap justify-between gap-2">
          <Button type="button" variant="secondary" loading={remove.isPending} onClick={async () => { if (await ask(`Delete ${reg.name}? Only an empty register can be deleted.`, { confirmLabel: "Delete", danger: true })) remove.mutate(); }}>Delete</Button>
          <div className="flex gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
        </div>
      </form>
    </Modal>
  );
}
