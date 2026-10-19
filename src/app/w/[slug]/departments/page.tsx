"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import type { Department } from "@/lib/api/types";
import { useWorkspace, wsPath } from "@/lib/workspace";

const EMPTY = { name: "", code: "", description: "", head_id: "" as string, modules: [] as string[], is_active: true };

export default function DepartmentsPage() {
  const { slug, can } = useWorkspace();
  const p = wsPath(slug);
  const [editing, setEditing] = useState<Department | "new" | null>(null);
  const [form, setForm] = useState(EMPTY);

  const list = useQuery({ queryKey: ["departments", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/departments/", p)) });
  const employees = useQuery({
    queryKey: ["employees", slug, "all"],
    enabled: can("employees.view"),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/employees/", { params: { path: { workspace: slug }, query: { page_size: 200 } } })),
  });
  const catalog = useQuery({ queryKey: ["permission-catalog", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/roles/permissions/", p)) });

  const save = useMutation({
    mutationFn: async () => {
      const body = { ...form, head_id: form.head_id || null };
      if (editing === "new") return unwrap(await api.POST("/api/v1/w/{workspace}/departments/", { ...p, body }));
      const id = (editing as Department).id;
      return unwrap(await api.PATCH("/api/v1/w/{workspace}/departments/{id}/", { params: { path: { workspace: slug, id } }, body }));
    },
    onSuccess: () => { toast.success("Department saved"); setEditing(null); },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await api.DELETE("/api/v1/w/{workspace}/departments/{id}/", { params: { path: { workspace: slug, id } } })),
    onSuccess: () => { toast.success("Department deleted"); setEditing(null); },
    onError: (e) => toast.error(e.message),
  });

  function open(d: Department | "new") {
    save.reset();
    setForm(d === "new" ? EMPTY : { name: d.name, code: d.code ?? "", description: d.description ?? "", head_id: d.head_id ?? "", modules: (d.modules as string[]) ?? [], is_active: d.is_active ?? true });
    setEditing(d);
  }
  const moduleLabels = (catalog.data?.department_modules ?? {}) as Record<string, string>;
  const manage = can("departments.manage");
  const rows = list.data?.results ?? [];

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Departments"
        description="Each department runs one or more modules. Its head is the in-charge of those modules and receives their approvals and alerts."
        guide="departments"
        actions={manage && <Button onClick={() => open("new")}><Plus className="h-4 w-4" /> New department</Button>}
      />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="No departments yet">For example: Sales, Stores, Finance, HR.</EmptyState>
        ) : (
          <Table head={["Department", "Head (in-charge)", "Runs", "Employees"]}>
            {rows.map((d) => (
              <tr key={d.id} className={manage ? "cursor-pointer hover:bg-stone-50" : ""} onClick={() => manage && open(d)}>
                <Td className="font-medium">{d.name} {!d.is_active && <Badge>Inactive</Badge>}</Td>
                <Td>{d.head_name || <span className="text-stone-400">No head</span>}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">{((d.modules as string[]) ?? []).map((m) => <Badge key={m} tone="blue">{moduleLabels[m] ?? m}</Badge>)}</div>
                </Td>
                <Td>{d.employee_count}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={editing !== null} title={editing === "new" ? "New department" : "Edit department"} onClose={() => setEditing(null)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label="Name" error={fieldError(save.error, "name")}>
                <Input required value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
              </Field>
            </div>
            <Field label="Code" error={fieldError(save.error, "code")}>
              <Input value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} />
            </Field>
          </div>
          <Field label="Head" error={fieldError(save.error, "head_id")} hint="The head is the in-charge of the modules below.">
            <Select value={form.head_id} onChange={(e) => setForm((prev) => ({ ...prev, head_id: e.target.value }))}>
              <option value="">No head yet</option>
              {(employees.data?.results ?? []).map((emp) => <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.staff_number})</option>)}
            </Select>
          </Field>
          <fieldset>
            <legend className="text-sm font-medium text-stone-700">Modules this department runs</legend>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {Object.entries(moduleLabels).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.modules.includes(key)}
                    onChange={(e) => setForm((prev) => ({ ...prev, modules: e.target.checked ? [...prev.modules, key] : prev.modules.filter((m) => m !== key) }))}
                  />
                  {label}
                </label>
              ))}
            </div>
            {fieldError(save.error, "modules") && <p className="mt-1 text-xs text-red-600">{fieldError(save.error, "modules")}</p>}
          </fieldset>
          <Field label="Description" error={fieldError(save.error, "description")}>
            <Input value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
          </Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} /> Active</label>
          <FormError error={save.error} />
          <div className="flex justify-between gap-2">
            {editing !== "new" && editing !== null ? (
              <Button type="button" variant="ghost" className="text-red-600" loading={remove.isPending} onClick={() => confirm("Delete this department?") && remove.mutate(editing.id)}>Delete</Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" loading={save.isPending}>Save</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
