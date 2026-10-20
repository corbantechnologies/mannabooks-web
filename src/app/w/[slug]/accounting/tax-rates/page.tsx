"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { AccountOptions, useAccounts } from "@/lib/api/accounting";
import { api, fieldError, unwrap } from "@/lib/api/client";
import type { TaxRate } from "@/lib/api/types";
import { useWorkspace, wsPath } from "@/lib/workspace";

const KINDS = { vat: "VAT", withholding_vat: "Withholding VAT", withholding_tax: "Withholding tax" } as const;
type Kind = keyof typeof KINDS;
type Etims = "" | "A" | "B" | "C" | "D" | "E";
const EMPTY = { code: "", name: "", kind: "vat" as Kind, rate: "", etims_code: "" as Etims, sales_account_id: "", purchases_account_id: "", is_default: false, is_active: true };

export default function TaxRatesPage() {
  const { slug, can } = useWorkspace();
  const manage = can("taxrates.manage");
  const accounts = useAccounts(slug);
  const [editing, setEditing] = useState<TaxRate | "new" | null>(null);
  const [form, setForm] = useState(EMPTY);
  const list = useQuery({ queryKey: ["tax-rates", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/tax-rates/", wsPath(slug))) });
  const save = useMutation({
    mutationFn: async () => {
      const body = { ...form, sales_account_id: form.sales_account_id || null, purchases_account_id: form.purchases_account_id || null };
      if (editing === "new") return unwrap(await api.POST("/api/v1/w/{workspace}/tax-rates/", { ...wsPath(slug), body }));
      const id = (editing as TaxRate).id;
      return unwrap(await api.PATCH("/api/v1/w/{workspace}/tax-rates/{id}/", { params: { path: { workspace: slug, id } }, body }));
    },
    onSuccess: () => { toast.success("Tax rate saved"); setEditing(null); },
  });
  function open(t: TaxRate | "new") {
    save.reset();
    setForm(t === "new" ? EMPTY : {
      code: t.code, name: t.name, kind: (t.kind ?? "vat") as Kind, rate: String(t.rate), etims_code: (t.etims_code ?? "") as Etims,
      sales_account_id: t.sales_account_id ?? "", purchases_account_id: t.purchases_account_id ?? "", is_default: !!t.is_default, is_active: t.is_active ?? true,
    });
    setEditing(t);
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Tax rates"
        description="VAT charged on sales and purchases, and the withholding taxes customers deduct or you deduct from suppliers. The eTIMS code is what KRA receives with each line."
        guide="tax-rates"
        actions={manage && <Button onClick={() => open("new")}><Plus className="h-4 w-4" /> New tax rate</Button>}
      />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : (
          <Table head={["Code", "Name", "Kind", "Rate", "eTIMS", "Posted to", ""]}>
            {(list.data?.results ?? []).map((t) => (
              <tr key={t.id} className={manage ? "cursor-pointer hover:bg-stone-50" : ""} onClick={() => manage && open(t)}>
                <Td className="font-mono text-xs">{t.code}</Td>
                <Td className="font-medium">{t.name} {t.is_default && <Badge tone="green">Default</Badge>} {!t.is_active && <Badge>Off</Badge>}</Td>
                <Td>{KINDS[(t.kind ?? "vat") as Kind]}</Td>
                <Td className="font-mono">{Number(t.rate)}%</Td>
                <Td className="font-mono">{t.etims_code || "-"}</Td>
                <Td className="text-xs text-stone-500">{t.sales_account_name || "-"}</Td>
                <Td />
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={editing !== null} title={editing === "new" ? "New tax rate" : form.name} onClose={() => setEditing(null)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Code" error={fieldError(save.error, "code")}><Input required value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} /></Field>
            <div className="col-span-2"><Field label="Name" error={fieldError(save.error, "name")}><Input required value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} /></Field></div>
            <Field label="Kind" error={fieldError(save.error, "kind")}>
              <Select value={form.kind} onChange={(e) => setForm((prev) => ({ ...prev, kind: e.target.value as Kind }))}>{Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
            </Field>
            <Field label="Rate (%)" error={fieldError(save.error, "rate")}><Input required inputMode="decimal" value={form.rate} onChange={(e) => setForm((prev) => ({ ...prev, rate: e.target.value }))} /></Field>
            <Field label="eTIMS code" error={fieldError(save.error, "etims_code")}>
              <Select value={form.etims_code} onChange={(e) => setForm((prev) => ({ ...prev, etims_code: e.target.value as Etims }))}>
                <option value="">None</option><option value="A">A: Exempt</option><option value="B">B: 16%</option><option value="C">C: 0%</option><option value="D">D: Non-VAT</option><option value="E">E: 8%</option>
              </Select>
            </Field>
          </div>
          <Field label="Account for tax on sales" error={fieldError(save.error, "sales_account_id")}>
            <Select value={form.sales_account_id} onChange={(e) => setForm((prev) => ({ ...prev, sales_account_id: e.target.value }))}><option value="">None</option><AccountOptions accounts={accounts.data ?? []} /></Select>
          </Field>
          <Field label="Account for tax on purchases" error={fieldError(save.error, "purchases_account_id")}>
            <Select value={form.purchases_account_id} onChange={(e) => setForm((prev) => ({ ...prev, purchases_account_id: e.target.value }))}><option value="">None</option><AccountOptions accounts={accounts.data ?? []} /></Select>
          </Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_default} onChange={(e) => setForm((prev) => ({ ...prev, is_default: e.target.checked }))} /> Default VAT rate for new lines</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} /> In use</label>
          <FormError error={save.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
        </form>
      </Modal>
    </div>
  );
}
