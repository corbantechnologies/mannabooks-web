"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import type { Role } from "@/lib/api/types";
import { grants, useWorkspace, wsPath } from "@/lib/workspace";

export default function RolesPage() {
  const { slug, can } = useWorkspace();
  const p = wsPath(slug);
  const [editing, setEditing] = useState<Role | "new" | null>(null);
  const [form, setForm] = useState({ name: "", description: "", permissions: [] as string[] });

  const roles = useQuery({ queryKey: ["roles", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/roles/", p)) });
  const catalog = useQuery({ queryKey: ["permission-catalog", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/roles/permissions/", p)) });

  const save = useMutation({
    mutationFn: async () => {
      if (editing === "new") return unwrap(await api.POST("/api/v1/w/{workspace}/roles/", { ...p, body: form }));
      const id = (editing as Role).id;
      return unwrap(await api.PATCH("/api/v1/w/{workspace}/roles/{id}/", { params: { path: { workspace: slug, id } }, body: form }));
    },
    onSuccess: () => { toast.success("Role saved"); setEditing(null); },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await api.DELETE("/api/v1/w/{workspace}/roles/{id}/", { params: { path: { workspace: slug, id } } })),
    onSuccess: () => { toast.success("Role deleted"); setEditing(null); },
    onError: (e) => toast.error(e.message),
  });

  function open(role: Role | "new") {
    save.reset();
    setForm(role === "new" ? { name: "", description: "", permissions: [] } : { name: role.name, description: role.description ?? "", permissions: (role.permissions as string[]) ?? [] });
    setEditing(role);
  }
  function toggle(code: string, on: boolean) {
    setForm((prev) => ({ ...prev, permissions: on ? [...prev.permissions, code] : prev.permissions.filter((c) => c !== code) }));
  }
  const manage = can("roles.manage");
  const current = editing !== "new" && editing !== null ? editing : null;
  const isOwnerRole = current?.slug === "owner";
  const fullAccess = form.permissions.includes("*");

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Roles"
        description="A role is a set of permissions. Preset roles cover the usual jobs; copy the idea into custom roles for anything else."
        guide="team-and-roles"
        actions={manage && <Button onClick={() => open("new")}><Plus className="h-4 w-4" /> New role</Button>}
      />
      <Card>
        {roles.isLoading ? <div className="px-4"><Spinner /></div> : roles.error ? <div className="p-4"><ErrorState error={roles.error} /></div> : (
          <Table head={["Role", "Description", "Members", ""]}>
            {(roles.data?.results ?? []).map((r) => (
              <tr key={r.id} className="cursor-pointer hover:bg-stone-50" onClick={() => open(r)}>
                <Td className="font-medium">{r.name}</Td>
                <Td className="text-stone-600">{r.description}</Td>
                <Td>{r.member_count}</Td>
                <Td>{r.is_preset ? <Badge>Preset</Badge> : <Badge tone="blue">Custom</Badge>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={editing !== null} title={editing === "new" ? "New role" : form.name} onClose={() => setEditing(null)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          {(editing === "new" || !current?.is_preset) && (
            <Field label="Name" error={fieldError(save.error, "name")}>
              <Input required disabled={!manage} value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            </Field>
          )}
          <Field label="Description" error={fieldError(save.error, "description")}>
            <Input disabled={!manage} value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
          </Field>
          <fieldset disabled={!manage || isOwnerRole} className="space-y-2">
            <legend className="text-sm font-medium text-stone-700">Permissions</legend>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={fullAccess} onChange={(e) => toggle("*", e.target.checked)} /> Full access to everything
            </label>
            {!fullAccess && (
              <div className="max-h-80 divide-y divide-stone-100 overflow-y-auto rounded-md border border-stone-200">
                {(catalog.data?.modules ?? []).map((m) => (
                  <div key={m.module} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm">
                    <span className="w-40 font-medium text-stone-800">{m.label}</span>
                    {m.actions.map((action) => {
                      const code = `${m.module}.${action}`;
                      return (
                        <label key={code} className="flex items-center gap-1.5 text-stone-600">
                          <input type="checkbox" checked={grants(form.permissions, code)} disabled={form.permissions.includes(`${m.module}.*`)} onChange={(e) => toggle(code, e.target.checked)} />
                          {action.replace("_", " ")}
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
            {isOwnerRole && <p className="text-xs text-stone-500">The Owner role always has full access.</p>}
            {fieldError(save.error, "permissions") && <p className="text-xs text-red-600">{fieldError(save.error, "permissions")}</p>}
          </fieldset>
          <FormError error={save.error} />
          {manage && (
            <div className="flex justify-between gap-2">
              {current && !current.is_preset ? (
                <Button type="button" variant="ghost" className="text-red-600" loading={remove.isPending} onClick={() => confirm("Delete this role?") && remove.mutate(current.id)}>Delete</Button>
              ) : <span />}
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit" loading={save.isPending}>Save</Button>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
