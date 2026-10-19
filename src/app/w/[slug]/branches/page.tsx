"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Spinner, Table, Td, Textarea } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import type { Branch } from "@/lib/api/types";
import { useWorkspace, wsPath } from "@/lib/workspace";

const EMPTY = { name: "", code: "", phone: "", address: "", is_default: false, is_active: true };

export default function BranchesPage() {
  const { slug, can } = useWorkspace();
  const [editing, setEditing] = useState<Branch | "new" | null>(null);
  const [form, setForm] = useState(EMPTY);
  const list = useQuery({
    queryKey: ["branches", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/branches/", wsPath(slug))),
  });
  const save = useMutation({
    mutationFn: async () => {
      if (editing === "new") return unwrap(await api.POST("/api/v1/w/{workspace}/branches/", { ...wsPath(slug), body: form }));
      const id = (editing as Branch).id;
      return unwrap(await api.PATCH("/api/v1/w/{workspace}/branches/{id}/", { params: { path: { workspace: slug, id } }, body: form }));
    },
    onSuccess: () => {
      toast.success("Branch saved");
      setEditing(null);
    },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await api.DELETE("/api/v1/w/{workspace}/branches/{id}/", { params: { path: { workspace: slug, id } } })),
    onSuccess: () => {
      toast.success("Branch deleted");
      setEditing(null);
    },
    onError: (e) => toast.error(e.message),
  });

  function open(branch: Branch | "new") {
    save.reset();
    setForm(branch === "new" ? EMPTY : { name: branch.name, code: branch.code, phone: branch.phone ?? "", address: branch.address ?? "", is_default: !!branch.is_default, is_active: branch.is_active ?? true });
    setEditing(branch);
  }
  const manage = can("branches.manage");
  const branches = list.data?.results ?? [];

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Branches"
        description="The places you operate from: shops, offices, sites. Documents and stock will be recorded per branch."
        guide="branches"
        actions={manage && <Button onClick={() => open("new")}><Plus className="h-4 w-4" /> New branch</Button>}
      />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : branches.length === 0 ? (
          <EmptyState title="No branches" />
        ) : (
          <Table head={["Name", "Code", "Phone", "Status"]}>
            {branches.map((b) => (
              <tr key={b.id} className={manage ? "cursor-pointer hover:bg-stone-50" : ""} onClick={() => manage && open(b)}>
                <Td className="font-medium">{b.name} {b.is_default && <Badge tone="green">Default</Badge>}</Td>
                <Td>{b.code}</Td>
                <Td>{b.phone || "-"}</Td>
                <Td>{b.is_active ? <Badge tone="green">Open</Badge> : <Badge>Closed</Badge>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={editing !== null} title={editing === "new" ? "New branch" : "Edit branch"} onClose={() => setEditing(null)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label="Name" error={fieldError(save.error, "name")}>
                <Input required value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
              </Field>
            </div>
            <Field label="Code" error={fieldError(save.error, "code")}>
              <Input required value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} placeholder="NRB" />
            </Field>
          </div>
          <Field label="Phone" error={fieldError(save.error, "phone")}>
            <Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
          </Field>
          <Field label="Address" error={fieldError(save.error, "address")}>
            <Textarea value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} />
          </Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_default} onChange={(e) => setForm((prev) => ({ ...prev, is_default: e.target.checked }))} /> Default branch</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} /> Open</label>
          <FormError error={save.error} />
          <div className="flex justify-between gap-2">
            {editing !== "new" && editing !== null && !editing.is_default ? (
              <Button type="button" variant="ghost" className="text-red-600" loading={remove.isPending} onClick={() => confirm("Delete this branch?") && remove.mutate(editing.id)}>Delete</Button>
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
