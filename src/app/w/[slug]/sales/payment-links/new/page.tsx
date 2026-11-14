"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Card, Button, Field, FormError, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { useAccounts } from "@/lib/api/accounting";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { useProducts, useVatRates } from "@/lib/api/sales";
import { useWorkspace } from "@/lib/workspace";

type Purpose = "sale" | "deposit" | "donation" | "voucher";

const PURPOSES: { value: Purpose; label: string; hint: string }[] = [
  { value: "sale", label: "A sale", hint: "One product or service. Becomes a cash sale, with VAT and stock." },
  { value: "deposit", label: "A deposit or advance", hint: "Kept for the customer and applied to their invoice later." },
  { value: "donation", label: "A donation or contribution", hint: "Offerings, fundraising, contributions. Recorded as income, no VAT." },
  { value: "voucher", label: "A gift voucher", hint: "The payer gets a voucher by email to spend with you later." },
];

export default function NewPaymentLinkPage() {
  const { slug, context } = useWorkspace();
  const router = useRouter();
  const products = useProducts(slug);
  const rates = useVatRates(slug);
  const accounts = useAccounts(slug);
  const [purpose, setPurpose] = useState<Purpose>("sale");
  const [pricing, setPricing] = useState<"product" | "fixed" | "open">("fixed");
  const [f, setF] = useState({
    title: "", description: "", product_id: "", amount: "", min_amount: "", tax_rate_id: "", account_id: "", allow_quantity: false,
    max_quantity: "10", voucher_valid_days: "365", expires_on: "", max_payments: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const mode = purpose === "sale" ? pricing : pricing === "product" ? "fixed" : pricing;
  const income = (accounts.data ?? []).filter((a) => a.account_type === "income" && a.is_active);
  const create = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/payment-links/", {
      params: { path: { workspace: slug } },
      body: {
        title: f.title, description: f.description, purpose,
        product_id: mode === "product" ? f.product_id : null,
        amount: mode === "fixed" ? f.amount : null,
        min_amount: mode === "open" && f.min_amount ? f.min_amount : null,
        tax_rate_id: purpose === "sale" && mode !== "product" && f.tax_rate_id ? f.tax_rate_id : null,
        account_id: (purpose === "sale" || purpose === "donation") && mode !== "product" && f.account_id ? f.account_id : null,
        allow_quantity: mode !== "open" && f.allow_quantity, max_quantity: Number(f.max_quantity) || 1,
        voucher_valid_days: purpose === "voucher" && f.voucher_valid_days ? Number(f.voucher_valid_days) : null,
        expires_on: f.expires_on || null, max_payments: f.max_payments ? Number(f.max_payments) : null,
      } as never,
    })),
    onSuccess: (l) => { toast.success("Payment link ready to share"); router.push(`/w/${slug}/sales/payment-links/${l.id}`); },
  });
  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link href={`/w/${slug}/sales/payment-links`} className="text-sm text-stone-500 hover:underline">&larr; Payment links</Link>
      <PageHeader title="New payment link" description="One link takes payments for one thing. Share it on WhatsApp, by email or as a QR code." guide="payment-links" />
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
        <Card className="space-y-4 p-5">
          <Field label="What is the money for?">
            <div className="grid gap-2 sm:grid-cols-2">
              {PURPOSES.map((p) => (
                <label key={p.value} className={`cursor-pointer rounded-lg border p-3 text-sm ${purpose === p.value ? "border-brand-500 bg-brand-50" : "border-stone-200 hover:bg-stone-50"}`}>
                  <span className="flex items-center gap-2 font-medium text-stone-900">
                    <input type="radio" name="purpose" checked={purpose === p.value} onChange={() => { setPurpose(p.value); if (p.value !== "sale" && pricing === "product") setPricing("fixed"); }} />
                    {p.label}
                  </span>
                  <span className="mt-1 block text-stone-600">{p.hint}</span>
                </label>
              ))}
            </div>
          </Field>
          <Field label="Title" hint="What the payer sees, e.g. Deposit for kitchen cabinets, or Harambee for the new hall." error={fieldError(create.error, "title")}>
            <Input required maxLength={120} value={f.title} onChange={set("title")} />
          </Field>
          <Field label="Description (optional)"><Textarea rows={2} value={f.description} onChange={set("description")} /></Field>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="font-semibold">Price</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            {purpose === "sale" && <label className="flex items-center gap-2"><input type="radio" checked={mode === "product"} onChange={() => setPricing("product")} /> One of my products</label>}
            <label className="flex items-center gap-2"><input type="radio" checked={mode === "fixed"} onChange={() => setPricing("fixed")} /> A fixed amount</label>
            <label className="flex items-center gap-2"><input type="radio" checked={mode === "open"} onChange={() => setPricing("open")} /> The payer chooses</label>
          </div>
          {mode === "product" && (
            <>
              <Field label="Product" hint="At its selling price and VAT. Stock comes out when paid.">
                <Select required value={f.product_id} onChange={set("product_id")}>
                  <option value="">Choose</option>
                  {(products.data?.results ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
              <p className="rounded-md bg-stone-50 px-3 py-2 text-sm text-stone-600">
                Selling several products together? A payment link is for one thing.{" "}
                {context.workspace.store_enabled
                  ? <>Send people to your <Link className="font-medium text-brand-700 hover:underline" href={`/shop/${context.workspace.slug}`} target="_blank">online shop</Link>, which has a cart.</>
                  : <>Your <Link className="font-medium text-brand-700 hover:underline" href={`/w/${slug}/settings#shop`}>online shop</Link> has a cart; switch it on in Settings.</>}
              </p>
            </>
          )}
          {mode === "fixed" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`Amount (${context.workspace.currency})`} hint={purpose === "sale" ? "What the payer pays, VAT included." : undefined} error={fieldError(create.error, "amount")}>
                <Input required type="number" min="1" step="0.01" value={f.amount} onChange={set("amount")} />
              </Field>
              {purpose === "sale" && (
                <Field label="VAT in the price">
                  <Select value={f.tax_rate_id} onChange={set("tax_rate_id")}>
                    <option value="">No VAT</option>
                    {(rates.data?.results ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </Select>
                </Field>
              )}
            </div>
          )}
          {mode === "open" && (
            <Field label="Least amount (optional)" hint="Leave blank to accept any amount."><Input type="number" min="1" step="0.01" value={f.min_amount} onChange={set("min_amount")} /></Field>
          )}
          {mode !== "open" && (
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.allow_quantity} onChange={(e) => setF((p) => ({ ...p, allow_quantity: e.target.checked }))} /> Let them choose how many (for example tickets)</label>
              {f.allow_quantity && <div className="w-32"><Field label="Up to"><Input type="number" min="1" max="1000" value={f.max_quantity} onChange={set("max_quantity")} /></Field></div>}
            </div>
          )}
          {(purpose === "sale" || purpose === "donation") && mode !== "product" && (
            <Field label="Income account (optional)" hint={purpose === "donation" ? "Blank: Other income." : "Blank: Sales."}>
              <Select value={f.account_id} onChange={set("account_id")}>
                <option value="">{purpose === "donation" ? "Other income" : "Sales"}</option>
                {income.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
              </Select>
            </Field>
          )}
          {purpose === "voucher" && (
            <Field label="Voucher valid for (days)" hint="Blank: never expires."><Input type="number" min="1" value={f.voucher_valid_days} onChange={set("voucher_valid_days")} /></Field>
          )}
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="font-semibold">When it closes (optional)</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Last day"><Input type="date" value={f.expires_on} onChange={set("expires_on")} /></Field>
            <Field label="After this many payments" hint="For example the number of tickets."><Input type="number" min="1" value={f.max_payments} onChange={set("max_payments")} /></Field>
          </div>
        </Card>

        <FormError error={create.error} />
        <div className="flex justify-end gap-2">
          <Link href={`/w/${slug}/sales/payment-links`} className="rounded-md border border-stone-300 px-4 py-2 text-sm">Cancel</Link>
          <Button type="submit" loading={create.isPending}>Create link</Button>
        </div>
      </form>
    </div>
  );
}
