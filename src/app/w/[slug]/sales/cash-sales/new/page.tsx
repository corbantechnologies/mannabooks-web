"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { EditLine, LinesEditor, blankLine, linesToRequest, useDefaultVat } from "@/components/lines-editor";
import { Button, Card, Field, FormError, Input, PageHeader, Select } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { METHODS, depositFor as pickDeposit, useCustomers, useDepositAccounts } from "@/lib/api/sales";
import { todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function NewCashSalePage() {
  const { slug, context } = useWorkspace();
  const router = useRouter();
  const customers = useCustomers(slug);
  const deposits = useDepositAccounts(slug);
  const defaultVat = useDefaultVat(slug);
  const [head, setHead] = useState({ customer_id: "", customer_name: "", customer_pin: "", issue_date: todayIso(), method: "mpesa", payment_reference: "", deposit_account_id: "" });
  const [includeTax, setIncludeTax] = useState(true);
  const [stored, setStored] = useState<EditLine[] | null>(null);
  const lines = stored ?? [blankLine(defaultVat)];
  const setLines = (update: (prev: EditLine[]) => EditLine[]) => setStored((prev) => update(prev ?? [blankLine(defaultVat)]));
  const depositFor = (method: string) => pickDeposit(deposits.data, method);

  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/receipts/", {
      ...wsPath(slug),
      body: {
        customer_id: head.customer_id || null, customer_name: head.customer_name, customer_pin: head.customer_pin, issue_date: head.issue_date,
        method: head.method as "mpesa", payment_reference: head.payment_reference, deposit_account_id: head.deposit_account_id || depositFor(head.method),
        prices_include_tax: includeTax, redeem_points: 0, lines: linesToRequest(lines),
      },
    })),
    onSuccess: (r) => { toast.success(`Cash sale ${r.number} saved`); router.push(`/w/${slug}/sales/cash-sales/${r.id}`); },
  });
  const set = (key: keyof typeof head) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setHead((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="w-full">
      <Link href={`/w/${slug}/sales/cash-sales`} className="text-sm text-stone-500 hover:underline">&larr; Cash sales</Link>
      <PageHeader title="New cash sale" description="Saving it posts the sale and the money received at once." guide="cash-sales" />
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Card className="grid gap-3 p-4 sm:grid-cols-4">
          <Field label="Customer (optional)">
            <Select value={head.customer_id} onChange={set("customer_id")}>
              <option value="">Walk-in customer</option>
              {(customers.data?.results ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          {!head.customer_id && <Field label="Walk-in name"><Input value={head.customer_name} onChange={set("customer_name")} /></Field>}
          {!head.customer_id && <Field label="Their KRA PIN" hint="If they want it on the receipt."><Input value={head.customer_pin} maxLength={11} autoCapitalize="characters" className="uppercase" placeholder="P051234567X" onChange={set("customer_pin")} /></Field>}
          <Field label="Date"><Input type="date" required value={head.issue_date} onChange={set("issue_date")} /></Field>
          <Field label="Paid by"><Select value={head.method} onChange={(e) => setHead((prev) => ({ ...prev, method: e.target.value, deposit_account_id: "" }))}>{METHODS.filter((m) => m.value !== "cheque").map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
          <Field label={head.method === "mpesa" ? "M-Pesa code" : "Reference"} error={fieldError(save.error, "payment_reference")}><Input required={head.method === "mpesa"} value={head.payment_reference} onChange={set("payment_reference")} /></Field>
          <Field label="Received into">
            <Select value={head.deposit_account_id || depositFor(head.method)} onChange={set("deposit_account_id")}>
              {deposits.data.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
            </Select>
          </Field>
        </Card>
        <LinesEditor slug={slug} customerId={head.customer_id} lines={lines} setLines={setLines} includeTax={includeTax} setIncludeTax={setIncludeTax} currency={context.workspace.currency ?? "KES"} />
        <FormError error={save.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Save cash sale</Button>
        </div>
      </form>
    </div>
  );
}
