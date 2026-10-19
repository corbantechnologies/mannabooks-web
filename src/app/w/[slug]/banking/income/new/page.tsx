"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { TagPickers, tagsBody } from "@/components/tag-pickers";
import { Button, Card, Field, FormError, Input, PageHeader, Select, Table, Td, Textarea } from "@/components/ui";
import { AccountOptions, useAccounts } from "@/lib/api/accounting";
import { useBankAccounts } from "@/lib/api/banking";
import { api, unwrap } from "@/lib/api/client";
import { useVatRates } from "@/lib/api/sales";
import { fmt, todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function NewIncomePage() {
  const { slug } = useWorkspace();
  const router = useRouter();
  const accounts = useBankAccounts(slug);
  const chart = useAccounts(slug);
  const rates = useVatRates(slug);
  const [head, setHead] = useState({ income_date: todayIso(), received_into_id: "", payer: "", reference: "", notes: "" });
  const [tags, setTags] = useState({ cost_center_id: "", project_id: "" });
  const [includeTax, setIncludeTax] = useState(true);
  const [lines, setLines] = useState([{ description: "", account_id: "", tax_rate_id: "", amount: "" }]);
  const active = (accounts.data?.results ?? []).filter((a) => a.is_active);
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/other-income/", {
      ...wsPath(slug), body: { ...head, received_into_id: head.received_into_id || active[0]?.id, prices_include_tax: includeTax, ...tagsBody(tags),
        lines: lines.filter((l) => Number(l.amount)).map((l) => ({ description: l.description, account_id: l.account_id || null, tax_rate_id: l.tax_rate_id || null, amount: l.amount })) } as never,
    })),
    onSuccess: (x) => { toast.success(`${x.number} saved`); router.push(`/w/${slug}/banking/income/${x.id}`); },
  });
  const set = (key: keyof typeof head) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setHead((p) => ({ ...p, [key]: e.target.value }));
  const total = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  return (
    <div className="max-w-5xl">
      <Link href={`/w/${slug}/banking/income`} className="text-sm text-stone-500 hover:underline">&larr; Other income</Link>
      <PageHeader title="Receive money" description="For money that isn't from a sale. Customer payments go under Sales > Payments." guide="other-income" />
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Card className="grid gap-3 p-4 sm:grid-cols-4">
          <Field label="Date"><Input type="date" required value={head.income_date} onChange={set("income_date")} /></Field>
          <Field label="Received into"><Select value={head.received_into_id || active[0]?.id || ""} onChange={set("received_into_id")}>{active.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
          <Field label="From"><Input value={head.payer} onChange={set("payer")} /></Field>
          <Field label="Reference"><Input value={head.reference} onChange={set("reference")} /></Field>
          <TagPickers value={tags} onChange={setTags} />
        </Card>
        <Card>
          <Table head={["Description", "Income account", "VAT", "Amount", ""]}>
            {lines.map((l, i) => (
              <tr key={i}>
                <Td><Input value={l.description} onChange={(e) => setLines((p) => p.map((x, n) => (n === i ? { ...x, description: e.target.value } : x)))} /></Td>
                <Td className="w-56"><Select value={l.account_id} onChange={(e) => setLines((p) => p.map((x, n) => (n === i ? { ...x, account_id: e.target.value } : x)))}><option value="">Other income</option><AccountOptions accounts={(chart.data ?? []).filter((a) => a.account_type === "income")} /></Select></Td>
                <Td className="w-40"><Select value={l.tax_rate_id} onChange={(e) => setLines((p) => p.map((x, n) => (n === i ? { ...x, tax_rate_id: e.target.value } : x)))}><option value="">No VAT</option>{(rates.data?.results ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Td>
                <Td className="w-36"><Input inputMode="decimal" className="text-right" value={l.amount} onChange={(e) => setLines((p) => p.map((x, n) => (n === i ? { ...x, amount: e.target.value } : x)))} /></Td>
                <Td className="w-10"><button type="button" aria-label="Remove" disabled={lines.length <= 1} className="text-stone-400 hover:text-red-600 disabled:opacity-30" onClick={() => setLines((p) => p.filter((_, n) => n !== i))}><Trash2 className="h-4 w-4" /></button></Td>
              </tr>
            ))}
          </Table>
          <div className="flex items-center justify-between px-3 py-2 text-sm">
            <div className="flex items-center gap-4">
              <Button type="button" variant="ghost" className="px-2 py-1" onClick={() => setLines((p) => [...p, { description: "", account_id: "", tax_rate_id: "", amount: "" }])}><Plus className="h-4 w-4" /> Add line</Button>
              <label className="flex items-center gap-2 text-stone-600"><input type="checkbox" checked={includeTax} onChange={(e) => setIncludeTax(e.target.checked)} /> Amounts include VAT</label>
            </div>
            <span className="font-semibold">Total {fmt(total)}</span>
          </div>
        </Card>
        <Field label="Notes"><Textarea rows={2} value={head.notes} onChange={set("notes")} /></Field>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
      </form>
    </div>
  );
}
