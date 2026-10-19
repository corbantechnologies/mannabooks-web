"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, ErrorState, Field, FormError, Input, PageHeader, Select, Spinner } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { useDepositAccounts } from "@/lib/api/sales";
import type { MpesaConnection } from "@/lib/api/types";
import { fmtDate } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function MpesaSettingsPage() {
  const { slug } = useWorkspace();
  const conn = useQuery({ queryKey: ["mpesa-connection", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/mpesa/connection/", wsPath(slug))) });
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="M-Pesa (Daraja)" description="Connect your own paybill or till so customers can pay by M-Pesa prompt, and payments to your number appear in MannaBooks." guide="mpesa" />
      <div className="rounded-md border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
        Money goes straight to your paybill or till; MannaBooks never holds it. You need a Daraja app linked to your shortcode
        (from developer.safaricom.co.ke, &quot;Go Live&quot;). Without it you can still record M-Pesa payments by typing the M-Pesa code.
      </div>
      {conn.isLoading ? <Spinner /> : conn.error ? <ErrorState error={conn.error} /> : <ConnectionForm conn={conn.data!} />}
    </div>
  );
}

function ConnectionForm({ conn }: { conn: MpesaConnection }) {
  const { slug, can } = useWorkspace();
  const manage = can("mpesa.manage");
  const deposits = useDepositAccounts(slug);
  const [form, setForm] = useState({
    environment: (conn.environment ?? "sandbox") as "sandbox" | "production", shortcode_type: (conn.shortcode_type ?? "paybill") as "paybill" | "till",
    shortcode: conn.shortcode ?? "", till_number: conn.till_number ?? "", consumer_key: "", consumer_secret: "", passkey: "",
    deposit_account_id: conn.deposit_account_id ?? "", is_active: conn.is_active ?? false,
  });
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PUT("/api/v1/w/{workspace}/mpesa/connection/", { ...wsPath(slug), body: { ...form, deposit_account_id: form.deposit_account_id || null } })),
    onSuccess: () => { toast.success("M-Pesa settings saved"); setForm((prev) => ({ ...prev, consumer_key: "", consumer_secret: "", passkey: "" })); },
  });
  const action = useMutation({
    mutationFn: async (which: "test" | "register") =>
      unwrap(await api.POST("/api/v1/w/{workspace}/mpesa/connection/{action}/", { params: { path: { workspace: slug, action: which } } })),
    onSuccess: (_, which) => toast.success(which === "test" ? "Safaricom accepted your keys" : "Safaricom will now send payments made to your number"),
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const saved = conn.has_credentials ? "Saved. Enter a new one only to replace it." : undefined;
  return (
    <Card className="p-5">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto font-semibold">Your Daraja app</h2>
          {conn.verified_at && <Badge tone="green">Keys checked {fmtDate(conn.verified_at)}</Badge>}
          {conn.c2b_registered_at && <Badge tone="green">Receiving direct payments</Badge>}
          {conn.last_error && <Badge tone="red">{conn.last_error}</Badge>}
        </div>
        <fieldset disabled={!manage} className="grid gap-3 sm:grid-cols-2">
          <Field label="Type"><Select value={form.shortcode_type} onChange={set("shortcode_type")}><option value="paybill">Paybill</option><option value="till">Till (Buy Goods)</option></Select></Field>
          <Field label="Environment"><Select value={form.environment} onChange={set("environment")}><option value="sandbox">Sandbox (testing)</option><option value="production">Production</option></Select></Field>
          <Field label={form.shortcode_type === "till" ? "Store number (head office)" : "Paybill number"} error={fieldError(save.error, "shortcode")}><Input required inputMode="numeric" value={form.shortcode} onChange={set("shortcode")} /></Field>
          {form.shortcode_type === "till" && <Field label="Till number" error={fieldError(save.error, "till_number")}><Input required inputMode="numeric" value={form.till_number} onChange={set("till_number")} /></Field>}
          <Field label="Consumer key" hint={saved} error={fieldError(save.error, "consumer_key")}><Input type="password" autoComplete="off" value={form.consumer_key} onChange={set("consumer_key")} /></Field>
          <Field label="Consumer secret" hint={saved} error={fieldError(save.error, "consumer_secret")}><Input type="password" autoComplete="off" value={form.consumer_secret} onChange={set("consumer_secret")} /></Field>
          <Field label="Passkey (Lipa na M-Pesa Online)" hint={saved} error={fieldError(save.error, "passkey")}><Input type="password" autoComplete="off" value={form.passkey} onChange={set("passkey")} /></Field>
          <Field label="Money lands in" hint="Blank: the M-Pesa account." error={fieldError(save.error, "deposit_account_id")}>
            <Select value={form.deposit_account_id} onChange={set("deposit_account_id")}>
              <option value="">M-Pesa account</option>
              {deposits.data.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
            </Select>
          </Field>
        </fieldset>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!manage} checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} /> Use M-Pesa prompts in MannaBooks</label>
        <FormError error={save.error ?? action.error} />
        {manage && (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={save.isPending}>Save</Button>
            <Button type="button" variant="secondary" disabled={!conn.has_credentials} loading={action.isPending && action.variables === "test"} onClick={() => action.mutate("test")}>Check keys with Safaricom</Button>
            <Button type="button" variant="secondary" disabled={!conn.has_credentials} loading={action.isPending && action.variables === "register"} onClick={() => action.mutate("register")}>Receive direct payments</Button>
          </div>
        )}
      </form>
    </Card>
  );
}
