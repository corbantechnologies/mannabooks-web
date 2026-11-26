"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { ask } from "@/components/confirm";
import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { useAssignees } from "@/lib/api/crm";
import { useWorkspace } from "@/lib/workspace";

type Item = components["schemas"]["ChecklistItem"];
const WHO: Record<string, string> = { everyone: "Everyone", role: "A role", department: "A department", person: "One person" };

/**
 * Settings > Daily checklist: the lines every person's "My day" starts with, and who each is for. Built-in lines count
 * what is waiting and tick themselves; they can be switched off or narrowed to some people, not deleted.
 */
export default function ChecklistSettingsPage() {
  const { slug, can } = useWorkspace();
  const qc = useQueryClient();
  const key = ["checklist-items", slug, "business"];
  const q = useQuery({
    queryKey: key, enabled: can("workspace.manage"),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/dashboard/checklist/items/", { params: { path: { workspace: slug }, query: { scope: "business" } } })),
  });
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const refresh = () => { void qc.invalidateQueries({ queryKey: key }); void qc.invalidateQueries({ queryKey: ["my-day", slug] }); };
  const patch = useMutation({
    mutationFn: async (v: { id: string; body: Partial<Item> }) => unwrap(await api.PATCH("/api/v1/w/{workspace}/dashboard/checklist/items/{id}/", { params: { path: { workspace: slug, id: v.id } }, body: v.body })),
    onSuccess: refresh, onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { await api.DELETE("/api/v1/w/{workspace}/dashboard/checklist/items/{id}/", { params: { path: { workspace: slug, id } } }); },
    onSuccess: refresh,
  });
  if (!can("workspace.manage")) return <ErrorState error={new Error("Workspace settings: manage sets the business's checklist.")} />;
  const rows = q.data ?? [];
  const move = (i: number, by: number) => {
    const a = rows[i], b = rows[i + by];
    if (!a || !b) return;
    patch.mutate({ id: a.id!, body: { position: b.position } });
    patch.mutate({ id: b.id!, body: { position: a.position } });
  };
  return (
    <div className="w-full">
      <PageHeader title="Daily checklist" guide="my-day"
        description="The lines each person's My day starts with on the Overview. Lines that count what is waiting tick themselves when nothing is. People can hide a line from their own list and add their own."
        actions={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add a line</Button>} />
      <p className="mb-3 text-sm"><Link href={`/w/${slug}/settings`} className="text-brand-700 hover:underline">&larr; Settings</Link></p>
      <Card>
        {q.isLoading ? <div className="px-4"><Spinner /></div> : q.error ? <div className="p-4"><ErrorState error={q.error} /></div> : rows.length === 0 ? <EmptyState title="No lines yet" /> : (
          <Table head={["Line", "For", "Kind", "On", ""]}>
            {rows.map((r, i) => (
              <tr key={r.id} className={r.is_active ? "" : "opacity-60"}>
                <Td>
                  <button type="button" className="text-left font-medium hover:underline" onClick={() => setEditing(r)}>{r.title}</button>
                  {r.link && <span className="block text-xs text-stone-500">Opens {r.link}</span>}
                </Td>
                <Td>{r.audience === "role" ? r.role_name : r.audience === "department" ? r.department_name : r.audience === "person" ? r.person_name : "Everyone"}</Td>
                <Td>{r.counts ? <Badge tone="blue">Counts what&apos;s waiting</Badge> : r.key === "plan_day" ? <Badge tone="blue">Picks today&apos;s tasks</Badge> : <Badge>Ticked by hand</Badge>}</Td>
                <Td><input type="checkbox" aria-label={`Switch ${r.title} on or off`} checked={!!r.is_active} onChange={(e) => patch.mutate({ id: r.id!, body: { is_active: e.target.checked } })} /></Td>
                <Td className="whitespace-nowrap text-right">
                  <button type="button" aria-label="Up" className="p-1 text-stone-500 hover:text-stone-900" onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" aria-label="Down" className="p-1 text-stone-500 hover:text-stone-900" onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></button>
                  {!r.built_in && (
                    <button type="button" aria-label={`Delete ${r.title}`} className="p-1 text-stone-400 hover:text-red-600"
                      onClick={() => void ask(`Delete the line "${r.title}"?`, { confirmLabel: "Delete", danger: true }).then((ok) => ok && remove.mutate(r.id!))}><Trash2 className="h-4 w-4" /></button>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {editing && <LineForm slug={slug} item={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { refresh(); setEditing(null); }} />}
    </div>
  );
}

function LineForm({ slug, item, onClose, onSaved }: { slug: string; item: Item | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    title: item?.title ?? "", link: item?.link ?? "", audience: item?.audience ?? "everyone",
    role_id: item?.role_id ?? "", department_id: item?.department_id ?? "", membership_id: item?.membership_id ?? "",
  });
  const roles = useQuery({ queryKey: ["roles", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/roles/", { params: { path: { workspace: slug } } })) });
  const depts = useQuery({ queryKey: ["departments", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/departments/", { params: { path: { workspace: slug } } })) });
  const people = useAssignees(slug);
  const save = useMutation({
    mutationFn: async () => {
      const body = {
        title: f.title, audience: f.audience as "everyone", ...(item?.built_in ? {} : { link: f.link }),
        role_id: f.audience === "role" ? f.role_id || null : null, department_id: f.audience === "department" ? f.department_id || null : null,
        membership_id: f.audience === "person" ? f.membership_id || null : null,
      };
      return item
        ? unwrap(await api.PATCH("/api/v1/w/{workspace}/dashboard/checklist/items/{id}/", { params: { path: { workspace: slug, id: item.id! } }, body }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/dashboard/checklist/items/", { params: { path: { workspace: slug } }, body }));
    },
    onSuccess: () => { toast.success("Line saved"); onSaved(); },
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));
  const roleList = (roles.data as { results?: { id: string; name: string }[] } | undefined)?.results ?? [];
  const deptList = (depts.data as { results?: { id: string; name: string }[] } | undefined)?.results ?? [];
  return (
    <Modal open title={item ? "Change the line" : "Add a line"} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Field label="What to do"><Input required maxLength={120} value={f.title} onChange={set("title")} placeholder="e.g. Open the till and count the float" /></Field>
        {!item?.built_in && (
          <Field label="Opens a page (optional)" hint="A page in MannaBooks, e.g. /pos or /banking. Opening it ticks the line.">
            <Input value={f.link} onChange={set("link")} placeholder="/pos" />
          </Field>
        )}
        <Field label="For">
          <Select value={f.audience} onChange={set("audience")}>{Object.entries(WHO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        </Field>
        {f.audience === "role" && (
          <Field label="Role"><Select required value={f.role_id} onChange={set("role_id")}><option value="">Choose</option>{roleList.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field>
        )}
        {f.audience === "department" && (
          <Field label="Department"><Select required value={f.department_id} onChange={set("department_id")}><option value="">Choose</option>{deptList.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
        )}
        {f.audience === "person" && (
          <Field label="Person"><Select required value={f.membership_id} onChange={set("membership_id")}><option value="">Choose</option>{people.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</Select></Field>
        )}
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
      </form>
    </Modal>
  );
}
