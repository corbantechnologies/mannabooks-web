"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { ACCOUNT_TYPES, SUBTYPES, useAccounts } from "@/lib/api/accounting";
import { api, fieldError, unwrap } from "@/lib/api/client";
import type { LedgerAccount } from "@/lib/api/types";
import { fmt } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

type AccountType = "asset" | "liability" | "equity" | "income" | "expense";
const EMPTY = { code: "", name: "", account_type: "expense" as AccountType, subtype: "expense", description: "", is_active: true };

export default function ChartOfAccountsPage() {
  const { slug, can, context } = useWorkspace();
  const accounts = useAccounts(slug);
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<LedgerAccount | "new" | null>(null);
  const [form, setForm] = useState(EMPTY);
  const manage = can("ledgeraccounts.manage");

  const save = useMutation({
    mutationFn: async () => {
      const body = { ...form, subtype: form.subtype as LedgerAccount["subtype"] };
      if (editing === "new") return unwrap(await api.POST("/api/v1/w/{workspace}/ledger-accounts/", { ...wsPath(slug), body }));
      const id = (editing as LedgerAccount).id;
      return unwrap(await api.PATCH("/api/v1/w/{workspace}/ledger-accounts/{id}/", { params: { path: { workspace: slug, id } }, body }));
    },
    onSuccess: () => { toast.success("Account saved"); setEditing(null); },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await api.DELETE("/api/v1/w/{workspace}/ledger-accounts/{id}/", { params: { path: { workspace: slug, id } } })),
    onSuccess: () => { toast.success("Account deleted"); setEditing(null); },
    onError: (e) => toast.error(e.message),
  });

  function open(a: LedgerAccount | "new") {
    save.reset();
    setForm(a === "new" ? EMPTY : { code: a.code, name: a.name, account_type: a.account_type, subtype: a.subtype, description: a.description ?? "", is_active: a.is_active ?? true });
    setEditing(a);
  }
  const current = editing !== "new" && editing !== null ? editing : null;
  const rows = (accounts.data ?? []).filter((a) => showInactive || a.is_active);

  return (
    <div className="w-full">
      <PageHeader
        title="Chart of accounts"
        description={`Every account the business records money in, with its balance today in ${context.workspace.currency}. Click an account to see its entries.`}
        guide="chart-of-accounts"
        actions={manage && <Button onClick={() => open("new")}><Plus className="h-4 w-4" /> New account</Button>}
      />
      <label className="mb-3 flex items-center gap-2 text-sm text-stone-600">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Show inactive accounts
      </label>
      {accounts.isLoading ? <Spinner /> : accounts.error ? <ErrorState error={accounts.error} /> : (
        <div className="space-y-5">
          {ACCOUNT_TYPES.map((t) => {
            const group = rows.filter((a) => a.account_type === t.value);
            if (!group.length) return null;
            const total = group.reduce((sum, a) => sum + Number(a.balance), 0);
            return (
              <Card key={t.value}>
                <div className="flex items-center justify-between px-4 pt-3 text-sm font-semibold text-stone-800">
                  <span>{t.label}</span><span className="font-mono">{fmt(total)}</span>
                </div>
                <Table head={["Code", "Account", "Type", "Balance", ""]}>
                  {group.map((a) => (
                    <tr key={a.id} className="hover:bg-stone-50">
                      <Td className="w-20 font-mono text-xs">{a.code}</Td>
                      <Td>
                        <Link href={`/w/${slug}/accounting/accounts/${a.id}`} className="font-medium text-stone-900 hover:underline">{a.name}</Link>
                        {a.is_system && <span className="ml-2"><Badge tone="blue">System</Badge></span>}
                        {!a.is_active && <span className="ml-2"><Badge>Inactive</Badge></span>}
                      </Td>
                      <Td className="text-stone-500">{SUBTYPES[a.account_type]?.find((s) => s.value === a.subtype)?.label}</Td>
                      <Td className="text-right font-mono">{fmt(a.balance)}</Td>
                      <Td className="w-16 text-right">{manage && <Button variant="ghost" className="px-2 py-1" onClick={() => open(a)}>Edit</Button>}</Td>
                    </tr>
                  ))}
                </Table>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={editing !== null} title={current ? `${current.code} ${current.name}` : "New account"} onClose={() => setEditing(null)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Code" error={fieldError(save.error, "code")}><Input required value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} /></Field>
            <div className="sm:col-span-2"><Field label="Name" error={fieldError(save.error, "name")}><Input required value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} /></Field></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type" error={fieldError(save.error, "account_type")}>
              <Select disabled={current?.is_system} value={form.account_type} onChange={(e) => { const t = e.target.value as AccountType; setForm((prev) => ({ ...prev, account_type: t, subtype: SUBTYPES[t][0].value })); }}>
                {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </Field>
            <Field label="Detail type" error={fieldError(save.error, "subtype")}>
              <Select disabled={current?.is_system} value={form.subtype} onChange={(e) => setForm((prev) => ({ ...prev, subtype: e.target.value }))}>
                {SUBTYPES[form.account_type].map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Description" error={fieldError(save.error, "description")}><Input value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} /></Field>
          {!current?.is_system && (
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} /> Active</label>
          )}
          {current?.is_system && <p className="text-xs text-stone-500">MannaBooks posts to this account automatically. You can rename it, but not change its type or switch it off.</p>}
          <FormError error={save.error} />
          <div className="flex justify-between gap-2">
            {current && !current.is_system ? (
              <Button type="button" variant="ghost" className="text-red-600" loading={remove.isPending} onClick={() => confirm("Delete this account?") && remove.mutate(current.id)}>Delete</Button>
            ) : <span />}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" loading={save.isPending}>Save</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
