"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { useDefaultVat } from "@/components/lines-editor";
import { BuyLine, PurchaseLinesEditor, blankBuyLine, buyLinesToRequest } from "@/components/purchase-lines";
import { TagPickers, tagsBody } from "@/components/tag-pickers";
import { Button, Card, Field, FormError, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { useBankAccounts } from "@/lib/api/banking";
import { api, unwrap } from "@/lib/api/client";
import { PAY_METHODS, useSuppliers } from "@/lib/api/purchasing";
import { todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function NewExpensePage() {
  const { slug } = useWorkspace();
  const router = useRouter();
  const accounts = useBankAccounts(slug);
  const suppliers = useSuppliers(slug);
  const defaultVat = useDefaultVat(slug);
  const [head, setHead] = useState({ expense_date: todayIso(), paid_from_id: "", payee: "", supplier_id: "", method: "mpesa", reference: "", supplier_etims_number: "", notes: "" });
  const [tags, setTags] = useState({ cost_center_id: "", project_id: "" });
  const [includeTax, setIncludeTax] = useState(true);
  const [stored, setStored] = useState<BuyLine[] | null>(null);
  const lines = stored ?? [blankBuyLine(defaultVat)];
  const setLines = (u: (p: BuyLine[]) => BuyLine[]) => setStored((p) => u(p ?? [blankBuyLine(defaultVat)]));
  const active = (accounts.data?.results ?? []).filter((a) => a.is_active);
  const fallback = active.find((a) => a.kind === (head.method === "mpesa" ? "mobile" : head.method === "cash" ? "cash" : "bank"))?.id ?? active[0]?.id ?? "";
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/expenses/", {
      ...wsPath(slug), body: { ...head, paid_from_id: head.paid_from_id || fallback, supplier_id: head.supplier_id || null, prices_include_tax: includeTax, lines: buyLinesToRequest(lines), ...tagsBody(tags) } as never,
    })),
    onSuccess: (x) => { toast.success(`${x.number} saved`); router.push(`/w/${slug}/banking/expenses/${x.id}`); },
  });
  const set = (key: keyof typeof head) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setHead((p) => ({ ...p, [key]: e.target.value }));
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/banking/expenses`} className="text-sm text-stone-500 hover:underline">&larr; Expenses</Link>
      <PageHeader title="Spend money" description="For costs paid on the spot. For a supplier's invoice you pay later, enter a bill instead." guide="expenses" />
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Card className="grid gap-3 p-4 sm:grid-cols-4">
          <Field label="Date"><Input type="date" required value={head.expense_date} onChange={set("expense_date")} /></Field>
          <Field label="Paid by"><Select value={head.method} onChange={(e) => setHead((p) => ({ ...p, method: e.target.value, paid_from_id: "" }))}>{[...PAY_METHODS, { value: "card", label: "Card" }].map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
          <Field label="Paid from"><Select value={head.paid_from_id || fallback} onChange={set("paid_from_id")}>{active.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
          <Field label={head.method === "mpesa" ? "M-Pesa code" : "Reference"}><Input value={head.reference} onChange={set("reference")} /></Field>
          <Field label="Paid to"><Input value={head.payee} onChange={set("payee")} placeholder="Rubis Thika Road" /></Field>
          <Field label="Or a supplier"><Select value={head.supplier_id} onChange={set("supplier_id")}><option value="">None</option>{(suppliers.data?.results ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="eTIMS CU no. on the receipt" hint="To claim the VAT."><Input value={head.supplier_etims_number} onChange={set("supplier_etims_number")} /></Field>
          <TagPickers value={tags} onChange={setTags} />
        </Card>
        <PurchaseLinesEditor slug={slug} lines={lines} setLines={setLines} includeTax={includeTax} setIncludeTax={setIncludeTax} />
        <Field label="Notes"><Textarea rows={2} value={head.notes} onChange={set("notes")} /></Field>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button><Button type="submit" loading={save.isPending}>Save expense</Button></div>
      </form>
    </div>
  );
}
