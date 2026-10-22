"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { DOC_TYPES, LEVEL_KINDS, type ApprovalRule } from "@/lib/api/control";
import { fmt } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

type Level = { kind: string; role_id?: string | null; membership_id?: string | null };
const blank = { name: "", document_type: "purchase_order", min_amount: "0", max_amount: "", is_active: true, levels: [{ kind: "supervisor" }] as Level[] };

export default function ApprovalRulesPage() {
  const { slug, can } = useWorkspace();
  const p = { params: { path: { workspace: slug } } };
  const rules = useQuery({ queryKey: ["approval-rules", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/approval-rules/", p)) });
  const roles = useQuery({ queryKey: ["roles", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/roles/", p)) });
  const members = useQuery({ queryKey: ["members", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/members/", { params: { path: { workspace: slug }, query: { page_size: 200 } } as never })) });
  const [editing, setEditing] = useState<ApprovalRule | "new" | null>(null);
  const [form, setForm] = useState(blank);
  function open(rule: ApprovalRule | "new") {
    setEditing(rule);
    setForm(rule === "new" ? blank : { name: rule.name, document_type: rule.document_type, min_amount: rule.min_amount ?? "0", max_amount: rule.max_amount ?? "",
      is_active: rule.is_active ?? true, levels: rule.levels.map((l) => ({ kind: l.kind, role_id: l.role_id, membership_id: l.membership_id })) });
  }
  const save = useMutation({
    mutationFn: async () => {
      const body = { ...form, max_amount: form.max_amount === "" ? null : form.max_amount };
      return editing && editing !== "new"
        ? unwrap(await api.PATCH("/api/v1/w/{workspace}/approval-rules/{id}/", { params: { path: { workspace: slug, id: editing.id } }, body: body as never }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/approval-rules/", { ...p, body: body as never }));
    },
    onSuccess: () => { toast.success("Rule saved"); setEditing(null); },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await api.DELETE("/api/v1/w/{workspace}/approval-rules/{id}/", { params: { path: { workspace: slug, id } } })),
    onSuccess: () => { toast.success("Rule deleted"); setEditing(null); },
  });
  const setLevel = (i: number, patch: Partial<Level>) => setForm((f) => ({ ...f, levels: f.levels.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
  const move = (i: number, by: number) => setForm((f) => {
    const levels = [...f.levels];
    const [x] = levels.splice(i, 1);
    levels.splice(i + by, 0, x);
    return { ...f, levels };
  });
  const list = rules.data ?? [];
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/approvals`} className="text-sm text-stone-500 hover:underline">&larr; Approvals</Link>
      <PageHeader title="Approval rules" guide="approvals"
        description="Who approves what, and in what order. A document that no rule covers is approved directly by anyone whose role allows it."
        actions={can("approvals.manage") && <Button onClick={() => open("new")}><Plus className="h-4 w-4" /> New rule</Button>} />
      <Card>
        {rules.isLoading ? <div className="px-4"><Spinner /></div> : rules.error ? <div className="p-4"><ErrorState error={rules.error} /></div> : list.length === 0 ? (
          <EmptyState title="No rules yet">Without rules, documents are approved by anyone with the approve permission (and team members with an approval limit pass bigger ones to the module in-charge).</EmptyState>
        ) : (
          <Table head={["Rule", "Applies to", "Amount", "Approved by, in order", ""]}>
            {list.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50">
                <Td className="font-medium">{r.name}</Td>
                <Td>{DOC_TYPES.find((d) => d.value === r.document_type)?.label}</Td>
                <Td className="font-mono text-xs">{fmt(r.min_amount)} {r.max_amount ? `to ${fmt(r.max_amount)}` : "and above"}</Td>
                <Td className="text-xs">{r.levels.map((l) => l.label).join(" \u2192 ")}</Td>
                <Td className="text-right">{!r.is_active && <Badge>Off</Badge>} {can("approvals.manage") && <Button variant="ghost" onClick={() => open(r)}>Edit</Button>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal size="lg" open={editing !== null} title={editing === "new" ? "New approval rule" : "Edit rule"} onClose={() => setEditing(null)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <Field label="Name"><Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Orders over 50,000" /></Field>
          <Field label="Applies to"><Select value={form.document_type} onChange={(e) => setForm((f) => ({ ...f, document_type: e.target.value }))}>{DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</Select></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="From amount"><Input type="number" min="0" step="0.01" value={form.min_amount} onChange={(e) => setForm((f) => ({ ...f, min_amount: e.target.value }))} /></Field>
            <Field label="Up to" hint="Blank: no upper limit."><Input type="number" min="0" step="0.01" value={form.max_amount} onChange={(e) => setForm((f) => ({ ...f, max_amount: e.target.value }))} /></Field>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-stone-700">Approved by, in order</p>
            <div className="space-y-2">
              {form.levels.map((l, i) => (
                <div key={i} className="rounded-md border border-stone-200 p-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-xs text-stone-500">{i + 1}.</span>
                    <Select value={l.kind} onChange={(e) => setLevel(i, { kind: e.target.value, role_id: null, membership_id: null })}>
                      {LEVEL_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                    </Select>
                    <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-stone-500 hover:bg-stone-100 disabled:opacity-30" aria-label="Up"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" disabled={i === form.levels.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-stone-500 hover:bg-stone-100 disabled:opacity-30" aria-label="Down"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" disabled={form.levels.length === 1} onClick={() => setForm((f) => ({ ...f, levels: f.levels.filter((_, j) => j !== i) }))} className="rounded p-1 text-stone-500 hover:bg-stone-100 disabled:opacity-30" aria-label="Remove"><X className="h-4 w-4" /></button>
                  </div>
                  {l.kind === "role" && <div className="mt-2 pl-7"><Select required value={l.role_id ?? ""} onChange={(e) => setLevel(i, { role_id: e.target.value })}><option value="">Choose a role</option>{(roles.data?.results ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></div>}
                  {l.kind === "member" && <div className="mt-2 pl-7"><Select required value={l.membership_id ?? ""} onChange={(e) => setLevel(i, { membership_id: e.target.value })}><option value="">Choose a person</option>{(members.data?.results ?? []).map((m) => <option key={m.id} value={m.id}>{m.user.full_name}</option>)}</Select></div>}
                  <p className="mt-1 pl-7 text-xs text-stone-500">{LEVEL_KINDS.find((k) => k.value === l.kind)?.hint}</p>
                </div>
              ))}
            </div>
            {form.levels.length < 6 && <Button type="button" variant="ghost" className="mt-1" onClick={() => setForm((f) => ({ ...f, levels: [...f.levels, { kind: "owner" }] }))}><Plus className="h-4 w-4" /> Add a level</Button>}
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} /> Rule is on</label>
          <FormError error={save.error || remove.error} />
          <div className="flex justify-between gap-2">
            {editing && editing !== "new" ? <Button type="button" variant="ghost" className="text-red-600" onClick={() => confirm("Delete this rule? Requests already sent keep their chain.") && remove.mutate(editing.id)}>Delete</Button> : <span />}
            <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={save.isPending}>Save rule</Button></div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
