"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { type CostCenter, useCostCenters } from "@/lib/api/control";
import { useWorkspace } from "@/lib/workspace";
import { ask } from "@/components/confirm";

export default function CostCentresPage() {
  const { slug, can } = useWorkspace();
  const p = { params: { path: { workspace: slug } } };
  const centres = useCostCenters(slug);
  const departments = useQuery({ queryKey: ["departments", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/departments/", p)) });
  const [editing, setEditing] = useState<CostCenter | "new" | null>(null);
  const [f, setF] = useState({ code: "", name: "", department_id: "", description: "", is_active: true });
  function open(c: CostCenter | "new") {
    setEditing(c);
    setF(c === "new" ? { code: "", name: "", department_id: "", description: "", is_active: true }
      : { code: c.code ?? "", name: c.name, department_id: c.department_id ?? "", description: c.description ?? "", is_active: c.is_active ?? true });
  }
  const save = useMutation({
    mutationFn: async () => {
      const body = { ...f, department_id: f.department_id || null };
      return editing && editing !== "new"
        ? unwrap(await api.PATCH("/api/v1/w/{workspace}/cost-centers/{id}/", { params: { path: { workspace: slug, id: editing.id } }, body }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/cost-centers/", { ...p, body }));
    },
    onSuccess: () => { toast.success("Cost centre saved"); setEditing(null); },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await api.DELETE("/api/v1/w/{workspace}/cost-centers/{id}/", { params: { path: { workspace: slug, id } } })),
    onSuccess: () => { toast.success("Deleted"); setEditing(null); },
  });
  const rows = centres.data ?? [];
  return (
    <div className="w-full">
      <PageHeader title="Cost centres" guide="cost-centres"
        description="Parts of the business you want a separate profit and loss for: a shop, a vehicle, a farm, a donor programme. Tag sales and costs with one, then filter reports by it."
        actions={can("budgets.manage") && <Button onClick={() => open("new")}><Plus className="h-4 w-4" /> New cost centre</Button>} />
      <Card>
        {centres.isLoading ? <div className="px-4"><Spinner /></div> : centres.error ? <div className="p-4"><ErrorState error={centres.error} /></div> : rows.length === 0 ? (
          <EmptyState title="No cost centres yet">Once you add one, invoices, bills and expenses get a Cost centre box.</EmptyState>
        ) : (
          <Table head={["Code", "Name", "Department", ""]}>
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-stone-50">
                <Td className="font-mono text-xs">{c.code}</Td>
                <Td>{c.name}{c.description && <span className="block text-xs text-stone-500">{c.description}</span>}</Td>
                <Td>{c.department_name ?? "-"}</Td>
                <Td className="text-right">{!c.is_active && <Badge>Inactive</Badge>} {can("budgets.manage") && <Button variant="ghost" onClick={() => open(c)}>Edit</Button>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={editing !== null} title={editing === "new" ? "New cost centre" : "Edit cost centre"} onClose={() => setEditing(null)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Code" hint="Blank: numbered for you." error={fieldError(save.error, "code")}><Input value={f.code} onChange={(e) => setF((x) => ({ ...x, code: e.target.value }))} placeholder="VAN1" /></Field>
            <div className="sm:col-span-2"><Field label="Name"><Input required value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} placeholder="Delivery van KDA 123A" /></Field></div>
          </div>
          <Field label="Department (optional)"><Select value={f.department_id} onChange={(e) => setF((x) => ({ ...x, department_id: e.target.value }))}><option value="">None</option>{(departments.data?.results ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
          <Field label="Description"><Input value={f.description} onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={(e) => setF((x) => ({ ...x, is_active: e.target.checked }))} /> Active (offered on new documents)</label>
          <FormError error={save.error || remove.error} />
          <div className="flex justify-between gap-2">
            {editing && editing !== "new" ? <Button type="button" variant="ghost" className="text-red-600" onClick={() => void ask("Delete this cost centre?").then((ok) => ok && remove.mutate(editing.id))}>Delete</Button> : <span />}
            <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
