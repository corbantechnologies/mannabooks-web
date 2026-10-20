"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { api, fieldError, unwrap } from "@/lib/api/client";
import type { Product } from "@/lib/api/types";
import { useWorkspace, wsPath } from "@/lib/workspace";

import { Button, Field, FormError, Input, Modal, Select } from "./ui";

/**
 * Add a product without leaving a document. It opens inside the document's own form, so it is not an HTML form
 * itself (a form inside a form would submit the document).
 */
export function QuickProductModal({ open, onClose, onCreated, initialName = "" }: {
  open: boolean; onClose: () => void; onCreated: (p: Product) => void; initialName?: string;
}) {
  const { slug } = useWorkspace();
  const [f, setF] = useState({ name: initialName, code: "", kind: "goods", sale_price: "", cost_price: "", track_inventory: false });
  const set = (k: "name" | "code" | "kind" | "sale_price" | "cost_price") => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/products/", {
      ...wsPath(slug),
      body: { ...f, sale_price: f.sale_price || "0", cost_price: f.cost_price || "0", track_inventory: f.kind === "goods" && f.track_inventory } as never,
    })),
    onSuccess: (p) => { toast.success(`${p.name} added`); onCreated(p); setF({ name: "", code: "", kind: "goods", sale_price: "", cost_price: "", track_inventory: false }); },
  });
  const submit = () => { if (f.name.trim()) save.mutate(); };
  return (
    <Modal open={open} title="New product or service" onClose={onClose}>
      <div className="space-y-3" onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") { e.preventDefault(); submit(); } }}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2"><Field label="Name" error={fieldError(save.error, "name")}><Input autoFocus value={f.name} onChange={set("name")} /></Field></div>
          <Field label="Code (SKU)" hint="Blank: numbered for you."><Input value={f.code} onChange={set("code")} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Type"><Select value={f.kind} onChange={set("kind")}><option value="goods">Goods</option><option value="service">Service</option></Select></Field>
          <Field label="Selling price"><Input inputMode="decimal" value={f.sale_price} onChange={set("sale_price")} placeholder="0" /></Field>
          <Field label="Cost price"><Input inputMode="decimal" value={f.cost_price} onChange={set("cost_price")} placeholder="0" /></Field>
        </div>
        {f.kind === "goods" && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.track_inventory} onChange={(e) => setF((x) => ({ ...x, track_inventory: e.target.checked }))} /> Track stock</label>
        )}
        <p className="text-xs text-stone-500">The usual VAT rate and accounts apply. Change anything else later under Products.</p>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" loading={save.isPending} disabled={!f.name.trim()} onClick={submit}>Add and use</Button>
        </div>
      </div>
    </Modal>
  );
}
