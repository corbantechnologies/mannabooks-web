"use client";

import { useMutation } from "@tanstack/react-query";
import { Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { api, fieldError, unwrap } from "@/lib/api/client";
import { useWorkspace } from "@/lib/workspace";

import { Button, Card, Field, FormError, Input, Textarea } from "./ui";

/** Switching the online shop on, and how customers can collect and pay. */
export function StoreSettings() {
  const { slug, context, can } = useWorkspace();
  const ws = context.workspace;
  const [form, setForm] = useState({
    store_enabled: !!ws.store_enabled, store_intro: ws.store_intro ?? "", store_allow_pickup: ws.store_allow_pickup ?? true,
    store_allow_delivery: ws.store_allow_delivery ?? true, store_delivery_fee: String(Number(ws.store_delivery_fee ?? 0)), store_pay_on_delivery: ws.store_pay_on_delivery ?? true,
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!form.store_allow_pickup && !form.store_allow_delivery) throw new Error("Allow pickup, delivery or both.");
      return unwrap(await api.PATCH("/api/v1/w/{workspace}/", { params: { path: { workspace: slug } }, body: { ...form, store_delivery_fee: form.store_delivery_fee || "0" } as never }));
    },
    onSuccess: () => toast.success(form.store_enabled ? "Shop saved and open" : "Shop saved (closed)"),
  });
  if (!can("workspace.manage")) return null;
  const link = typeof window !== "undefined" ? `${window.location.origin}/shop/${slug}` : `/shop/${slug}`;
  const tick = (k: "store_enabled" | "store_allow_pickup" | "store_allow_delivery" | "store_pay_on_delivery") => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.checked }));
  return (
    <Card className="p-5">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div>
          <h2 className="font-semibold">Online shop</h2>
          <p className="mt-1 text-sm text-stone-600">
            A public page where customers order the products you mark <strong>Sell online</strong>. Orders arrive in Sales &gt; Online orders.
            With M-Pesa connected (<Link className="underline" href={`/w/${slug}/mpesa`}>M-Pesa</Link>), customers can pay when they order.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.store_enabled} onChange={tick("store_enabled")} /> Shop is open</label>
        {form.store_enabled && ws.store_enabled && (
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-stone-50 px-3 py-2 text-sm">
            <span className="font-mono text-xs">{link}</span>
            <Button type="button" variant="ghost" className="px-2 py-1" onClick={() => { void navigator.clipboard.writeText(link); toast.success("Link copied"); }}><Copy className="h-4 w-4" /> Copy</Button>
            <a href={`/shop/${slug}`} target="_blank" rel="noreferrer"><Button type="button" variant="ghost" className="px-2 py-1"><ExternalLink className="h-4 w-4" /> Open</Button></a>
          </div>
        )}
        <Field label="Welcome text" hint="For example: Paint, hardware and plumbing. Order by 3 pm for same-day delivery in Nairobi.">
          <Textarea rows={2} value={form.store_intro} onChange={(e) => setForm((p) => ({ ...p, store_intro: e.target.value }))} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.store_allow_pickup} onChange={tick("store_allow_pickup")} /> Customers can collect</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.store_allow_delivery} onChange={tick("store_allow_delivery")} /> You deliver</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.store_pay_on_delivery} onChange={tick("store_pay_on_delivery")} /> They can pay on pickup or delivery</label>
          </div>
          {form.store_allow_delivery && (
            <Field label="Delivery fee" error={fieldError(save.error, "store_delivery_fee")}><Input inputMode="decimal" value={form.store_delivery_fee} onChange={(e) => setForm((p) => ({ ...p, store_delivery_fee: e.target.value }))} /></Field>
          )}
        </div>
        <FormError error={save.error} />
        <Button type="submit" loading={save.isPending}>Save shop</Button>
      </form>
    </Card>
  );
}
