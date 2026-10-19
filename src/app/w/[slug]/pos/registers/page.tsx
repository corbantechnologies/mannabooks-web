"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, Field, FormError, Input, Modal, PageHeader, Select, Table, Td } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { useDepositAccounts } from "@/lib/api/sales";
import type { PosRegister } from "@/lib/api/types";
import { useWorkspace, wsPath } from "@/lib/workspace";

const EMPTY = { name: "", branch_id: "", cash_account_id: "", mpesa_account_id: "", card_account_id: "", receipt_footer: "Thank you for shopping with us.", is_active: true };

export default function RegistersPage() {
  const { slug, can } = useWorkspace();
  const manage = can("pos.manage");
  const deposits = useDepositAccounts(slug);
  const registers = useQuery({ queryKey: ["pos-registers", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/pos/registers/", wsPath(slug))) });
  const branches = useQuery({ queryKey: ["branches", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/branches/", wsPath(slug))) });
  const [editing, setEditing] = useState<PosRegister | "new" | null>(null);
  const [form, setForm] = useState(EMPTY);
  const save = useMutation({
    mutationFn: async () => {
      const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, k.endsWith("_id") ? v || null : v])) as typeof form;
      if (editing === "new") return unwrap(await api.POST("/api/v1/w/{workspace}/pos/registers/", { ...wsPath(slug), body }));
      return unwrap(await api.PATCH("/api/v1/w/{workspace}/pos/registers/{id}/", { params: { path: { workspace: slug, id: (editing as PosRegister).id } }, body }));
    },
    onSuccess: () => { toast.success("Till saved"); setEditing(null); },
  });
  function open(r: PosRegister | "new") {
    save.reset();
    setForm(r === "new" ? EMPTY : {
      name: r.name, branch_id: r.branch_id ?? "", cash_account_id: r.cash_account_id ?? "", mpesa_account_id: r.mpesa_account_id ?? "",
      card_account_id: r.card_account_id ?? "", receipt_footer: r.receipt_footer ?? "", is_active: r.is_active ?? true,
    });
    setEditing(r);
  }
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const accountSelect = (key: "cash_account_id" | "mpesa_account_id" | "card_account_id", label: string, fallback: string) => (
    <Field label={label} error={fieldError(save.error, key)}>
      <Select value={form[key]} onChange={set(key)}>
        <option value="">{fallback}</option>
        {deposits.data.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
      </Select>
    </Field>
  );
  const rows = registers.data?.results ?? [];
  return (
    <div className="max-w-4xl">
      <Link href={`/w/${slug}/pos`} className="text-sm text-stone-500 hover:underline">&larr; Point of sale</Link>
      <PageHeader title="Tills" description="Each till has its own shifts and decides which account cash, M-Pesa and card money goes into." guide="pos"
        actions={manage && <Button onClick={() => open("new")}><Plus className="h-4 w-4" /> New till</Button>} />
      <Card>
        {rows.length === 0 ? <EmptyState title="No tills yet" /> : (
          <Table head={["Till", "Branch", "Shift"]}>
            {rows.map((r) => (
              <tr key={r.id} className={manage ? "cursor-pointer hover:bg-stone-50" : ""} onClick={() => manage && open(r)}>
                <Td className="font-medium">{r.name} {!r.is_active && <Badge>Inactive</Badge>}</Td>
                <Td>{r.branch_name ?? "-"}</Td>
                <Td>{r.open_shift_id ? <Badge tone="green">Open</Badge> : <span className="text-stone-500">Closed</span>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={editing !== null} title={editing && editing !== "new" ? editing.name : "New till"} onClose={() => setEditing(null)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" error={fieldError(save.error, "name")}><Input required value={form.name} onChange={set("name")} placeholder="Till 1" /></Field>
            <Field label="Branch">
              <Select value={form.branch_id} onChange={set("branch_id")}>
                <option value="">None</option>
                {(branches.data?.results ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            {accountSelect("cash_account_id", "Cash goes to", "Cash on hand")}
            {accountSelect("mpesa_account_id", "M-Pesa goes to", "M-Pesa")}
            {accountSelect("card_account_id", "Card goes to", "Bank account")}
          </div>
          <Field label="Receipt footer"><Input value={form.receipt_footer} onChange={set("receipt_footer")} /></Field>
          {editing !== "new" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} /> Active</label>}
          <FormError error={save.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
        </form>
      </Modal>
    </div>
  );
}
