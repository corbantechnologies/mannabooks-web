"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, Field, FormError, Input, PageHeader, Select } from "@/components/ui";
import { AccountOptions, useAccounts } from "@/lib/api/accounting";
import { useBankAccounts } from "@/lib/api/banking";
import { api, unwrap } from "@/lib/api/client";
import { useSuppliers } from "@/lib/api/purchasing";
import { useCustomers, useVatRates } from "@/lib/api/sales";
import { fmt, fmtDate, startDate } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

type Row = {
  key: number; open: boolean; kind: string; person_id: string; new_name: string; date: string; amount: string; bank_account_id: string;
  account_id: string; tax_rate_id: string; reference: string; description: string; supplier_invoice_number: string;
};

const NEW = "__new__";

/**
 * Money that already moved, in bulk (getting started, catching up). In: from customers, each sale a paid invoice. Out: to
 * suppliers, each purchase a paid bill. Or a payment only, for older documents or in advance. Each row folds away when done.
 */
export function BulkMoney({ direction }: { direction: "in" | "out" }) {
  const { slug } = useWorkspace();
  const router = useRouter();
  const into = direction === "in";
  const banks = useBankAccounts(slug);
  const chart = useAccounts(slug);
  const rates = useVatRates(slug);
  const customers = useCustomers(slug);
  const suppliers = useSuppliers(slug);
  const people = ((into ? customers.data?.results : suppliers.data?.results) ?? []) as { id: string; name: string; is_active?: boolean }[];
  const active = (banks.data?.results ?? []).filter((a) => a.is_active);
  const accounts = (chart.data ?? []).filter((a) => a.is_active && a.account_type === (into ? "income" : "expense"));
  const docKind = into ? "sale" : "purchase";
  const back = into ? `/w/${slug}/sales/payments` : `/w/${slug}/purchasing/payments`;
  const [next, setNext] = useState(1);
  const blank = (key: number, from?: Row): Row => ({
    key, open: true, kind: from?.kind ?? docKind, person_id: "", new_name: "", date: from?.date ?? startDate(), amount: "",
    bank_account_id: from?.bank_account_id ?? "", account_id: from?.account_id ?? "", tax_rate_id: from?.tax_rate_id ?? "", reference: "", description: "",
    supplier_invoice_number: "",
  });
  const [rows, setRows] = useState<Row[]>(() => [blank(0)]);
  const patch = (key: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const remove = (key: number) => setRows((rs) => rs.filter((r) => r.key !== key));
  const bankOf = (r: Row) => r.bank_account_id || active[0]?.id || "";
  const who = (r: Row) => (r.person_id === NEW ? r.new_name.trim() : people.find((p) => p.id === r.person_id)?.name ?? "");
  const ready = (r: Row) => Boolean(Number(r.amount) > 0 && r.date && bankOf(r) && who(r) && (into || r.kind === "payment" || r.account_id));
  const add = () => {
    const last = rows[rows.length - 1];
    setRows((rs) => [...rs.map((r) => (ready(r) ? { ...r, open: false } : r)), blank(next, last)]);
    setNext((n) => n + 1);
  };
  const save = useMutation({
    mutationFn: async () => {
      const body = {
        rows: rows.map((r) => ({
          ...(into
            ? { customer_id: r.person_id && r.person_id !== NEW ? r.person_id : null, new_customer: r.person_id === NEW ? r.new_name : "" }
            : { supplier_id: r.person_id && r.person_id !== NEW ? r.person_id : null, new_supplier: r.person_id === NEW ? r.new_name : "",
                supplier_invoice_number: r.supplier_invoice_number }),
          kind: r.kind, date: r.date, amount: r.amount, bank_account_id: bankOf(r), reference: r.reference, description: r.description,
          account_id: r.kind === "payment" ? null : r.account_id || null, tax_rate_id: r.kind === "payment" ? null : r.tax_rate_id || null,
        })),
      };
      return into
        ? unwrap(await api.POST("/api/v1/w/{workspace}/payments/bulk/", { ...wsPath(slug), body: body as never }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/supplier-payments/bulk/", { ...wsPath(slug), body: body as never }));
    },
    onSuccess: (made) => {
      const docs = made.filter((m) => m.document_id).length;
      toast.success(`${made.length} recorded${docs ? `: ${docs} paid ${into ? "invoice" : "bill"}(s) to add details to` : ""}`);
      router.push(back);
    },
  });
  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  return (
    <div className="w-full">
      <Link href={back} className="text-sm text-stone-500 hover:underline">&larr; {into ? "Customer payments" : "Supplier payments"}</Link>
      <PageHeader title={into ? "Money in from customers, in bulk" : "Money out to suppliers, in bulk"} guide={into ? "payments" : "supplier-payments"}
        description={into
          ? "Money already received. Each sale becomes a paid invoice (not sent to eTIMS), marked Details to add for whoever tidies them up. A new name is added as a customer. Nothing dated before your books start: that's in your opening balances."
          : "Money already paid. Each purchase becomes a paid bill, marked Details to add (the supplier's invoice and eTIMS numbers can come later). A new name is added as a supplier. Nothing dated before your books start."} />
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        {rows.map((r, i) => {
          const set = (key: keyof Row) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => patch(r.key, { [key]: e.target.value });
          const payOnly = r.kind === "payment";
          if (!r.open) {
            return (
              <Card key={r.key} className="flex flex-wrap items-center justify-between gap-2 bg-stone-50 px-3 py-2 text-sm">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => patch(r.key, { open: true })}>
                  <span className="font-medium">{i + 1}. {who(r)}{r.person_id === NEW ? " (new)" : ""}</span>
                  <span className="ml-2 text-stone-600">
                    {fmtDate(r.date)} · {payOnly ? "Payment only" : accounts.find((a) => a.id === r.account_id)?.name ?? (into ? "Sales" : "")} · {active.find((a) => a.id === bankOf(r))?.name}
                    {r.reference ? ` · ${r.reference}` : ""}
                  </span>
                </button>
                <span className="font-mono">{fmt(r.amount)}</span>
                <span className="flex gap-3">
                  <button type="button" className="text-xs text-brand-700 hover:underline" onClick={() => patch(r.key, { open: true })}>Change</button>
                  <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => remove(r.key)}>Remove</button>
                </span>
              </Card>
            );
          }
          return (
            <Card key={r.key} className="space-y-3 p-4">
              <p className="text-sm font-semibold">{into ? "Money in" : "Money out"} {i + 1}</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label={into ? "From (customer)" : "To (supplier)"}>
                  <Select required value={r.person_id} onChange={set("person_id")}>
                    <option value="">Choose</option>
                    <option value={NEW}>+ Someone new</option>
                    {people.filter((p) => p.is_active !== false).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </Field>
                {r.person_id === NEW && <Field label={into ? "New customer's name" : "New supplier's name"}><Input required value={r.new_name} onChange={set("new_name")} /></Field>}
                <Field label="What it was">
                  <Select value={r.kind} onChange={set("kind")}>
                    <option value={docKind}>{into ? "A sale (makes a paid invoice)" : "A purchase (makes a paid bill)"}</option>
                    <option value="payment">{into ? "Payment for older invoices or in advance" : "Payment for older bills or in advance"}</option>
                  </Select>
                </Field>
                <Field label="Date"><Input type="date" required value={r.date} onChange={set("date")} /></Field>
                <Field label="Amount" hint={payOnly ? undefined : "As paid, VAT included"}><Input required inputMode="decimal" value={r.amount} onChange={set("amount")} /></Field>
                <Field label={into ? "Received into" : "Paid from"}>
                  <Select value={bankOf(r)} onChange={set("bank_account_id")}>{active.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
                </Field>
                {!payOnly && (
                  <Field label="What for">
                    <Select required={!into} value={r.account_id} onChange={set("account_id")}>
                      <option value="">{into ? "Sales" : "Choose"}</option><AccountOptions accounts={accounts} />
                    </Select>
                  </Field>
                )}
                {!payOnly && (
                  <Field label="VAT">
                    <Select value={r.tax_rate_id} onChange={set("tax_rate_id")}><option value="">No VAT</option>{(rates.data?.results ?? []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>
                  </Field>
                )}
                <Field label="Reference"><Input value={r.reference} onChange={set("reference")} placeholder="M-Pesa code, bank reference" /></Field>
                {!into && !payOnly && <Field label="Their invoice no." hint="Blank: add it later"><Input value={r.supplier_invoice_number} onChange={set("supplier_invoice_number")} /></Field>}
                <Field label="Description"><Input value={r.description} onChange={set("description")} placeholder={into ? "e.g. Website design" : "e.g. Flyers"} /></Field>
              </div>
              {payOnly && <p className="text-xs text-stone-500">Applied to their oldest unpaid {into ? "invoices" : "bills"} first; anything left stays as credit on their account.</p>}
              <div className="flex flex-wrap justify-end gap-2">
                {rows.length > 1 && <Button type="button" variant="ghost" className="text-red-600" onClick={() => remove(r.key)}>Remove</Button>}
                <Button type="button" variant="secondary" disabled={!ready(r)} onClick={() => patch(r.key, { open: false })}>Done</Button>
              </div>
            </Card>
          );
        })}
        <Button type="button" variant="secondary" onClick={add}>Add another</Button>
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-stone-200 pt-3 text-sm text-stone-700">
          <span>{rows.length} record(s)</span><span>Total {fmt(total)}</span>
        </div>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" loading={save.isPending} disabled={!rows.length || !rows.every(ready)}>Save all {rows.length}</Button>
        </div>
      </form>
    </div>
  );
}
