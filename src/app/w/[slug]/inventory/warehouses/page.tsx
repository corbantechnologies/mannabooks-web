"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, Field, FormError, Input, Modal, PageHeader, Select, Table, Td } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { useWarehouses } from "@/lib/api/purchasing";
import type { Warehouse } from "@/lib/api/types";
import { fmt } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

const EMPTY = { name: "", code: "", branch_id: "", address: "", is_default: false, is_active: true };

export default function WarehousesPage() {
  const { slug, can } = useWorkspace();
  const manage = can("inventory.manage");
  const list = useWarehouses(slug);
  const branches = useQuery({ queryKey: ["branches", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/branches/", wsPath(slug))) });
  const [editing, setEditing] = useState<Warehouse | "new" | null>(null);
  const [form, setForm] = useState(EMPTY);
  const save = useMutation({
    mutationFn: async () => {
      const body = { ...form, branch_id: form.branch_id || null };
      if (editing === "new") return unwrap(await api.POST("/api/v1/w/{workspace}/warehouses/", { ...wsPath(slug), body }));
      return unwrap(await api.PATCH("/api/v1/w/{workspace}/warehouses/{id}/", { params: { path: { workspace: slug, id: (editing as Warehouse).id } }, body }));
    },
    onSuccess: () => { toast.success("Warehouse saved"); setEditing(null); },
  });
  function open(w: Warehouse | "new") {
    save.reset();
    setForm(w === "new" ? EMPTY : { name: w.name, code: w.code ?? "", branch_id: w.branch_id ?? "", address: w.address ?? "", is_default: w.is_default ?? false, is_active: w.is_active ?? true });
    setEditing(w);
  }
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p) => ({ ...p, [key]: e.target.value }));
  return (
    <div className="w-full">
      <PageHeader title="Warehouses" description="Places stock is kept. Sales at a branch take stock from that branch's warehouse, otherwise from the default." guide="inventory"
        actions={manage && <Button onClick={() => open("new")}><Plus className="h-4 w-4" /> New warehouse</Button>} />
      <Card>
        <Table head={["Name", "Code", "Branch", "Stock value", ""]}>
          {(list.data?.results ?? []).map((w) => (
            <tr key={w.id} className={manage ? "cursor-pointer hover:bg-stone-50" : ""} onClick={() => manage && open(w)}>
              <Td className="font-medium">{w.name} {!w.is_active && <Badge>Inactive</Badge>}</Td>
              <Td className="font-mono text-xs">{w.code || "-"}</Td>
              <Td>{w.branch_name ?? "-"}</Td>
              <Td className="text-right font-mono">{fmt(w.stock_value)}</Td>
              <Td>{w.is_default && <Badge tone="green">Default</Badge>}</Td>
            </tr>
          ))}
        </Table>
      </Card>
      <Modal open={editing !== null} title={editing && editing !== "new" ? editing.name : "New warehouse"} onClose={() => setEditing(null)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" error={fieldError(save.error, "name")}><Input required value={form.name} onChange={set("name")} /></Field>
            <Field label="Code" hint="Blank: numbered for you."><Input value={form.code} onChange={set("code")} /></Field>
            <Field label="Branch"><Select value={form.branch_id} onChange={set("branch_id")}><option value="">None</option>{(branches.data?.results ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_default} onChange={(e) => setForm((p) => ({ ...p, is_default: e.target.checked }))} /> Default warehouse</label>
          {editing !== "new" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} /> Active</label>}
          <FormError error={save.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
        </form>
      </Modal>
    </div>
  );
}
