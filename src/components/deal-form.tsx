"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { useAssignees } from "@/lib/api/crm";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { useCustomers } from "@/lib/api/sales";
import type { Deal } from "@/lib/api/types";
import { useWorkspace, wsPath } from "@/lib/workspace";

import { Button, Field, FormError, Input, Modal, Select, Textarea } from "./ui";

/** New or edit deal. A new deal opens its page after saving. */
export function DealForm({ open, onClose, deal }: { open: boolean; onClose: () => void; deal?: Deal }) {
  const { slug } = useWorkspace();
  const router = useRouter();
  const customers = useCustomers(slug);
  const assignees = useAssignees(slug);
  const [form, setForm] = useState({
    title: deal?.title ?? "", customer_id: deal?.customer_id ?? "", value: deal ? String(Number(deal.value ?? 0)) : "",
    probability: deal?.probability != null ? String(deal.probability) : "", expected_close_date: deal?.expected_close_date ?? "",
    assigned_to_id: deal?.assigned_to_id ?? "", notes: deal?.notes ?? "",
  });
  const save = useMutation({
    mutationFn: async () => {
      const body = { ...form, customer_id: form.customer_id || null, value: form.value || "0", probability: form.probability ? Number(form.probability) : null,
        expected_close_date: form.expected_close_date || null, assigned_to_id: form.assigned_to_id || null };
      return deal
        ? unwrap(await api.PATCH("/api/v1/w/{workspace}/deals/{id}/", { params: { path: { workspace: slug, id: deal.id } }, body }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/deals/", { ...wsPath(slug), body: { ...body, title: form.title } }));
    },
    onSuccess: (d) => { toast.success("Deal saved"); onClose(); if (!deal) router.push(`/w/${slug}/crm/deals/${d.id}`); },
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));
  return (
    <Modal size="lg" open={open} title={deal ? `Edit ${deal.title}` : "New deal"} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Field label="Deal" error={fieldError(save.error, "title")}><Input required value={form.title} onChange={set("title")} placeholder="Roofing sheets for Ruaka site" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Customer" error={fieldError(save.error, "customer_id")} hint="New prospects: add them as a lead first.">
            <Select value={form.customer_id} onChange={set("customer_id")}>
              <option value="">Choose</option>
              {(customers.data?.results ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Value before VAT" error={fieldError(save.error, "value")}><Input inputMode="decimal" value={form.value} onChange={set("value")} /></Field>
          <Field label="Expected to close"><Input type="date" value={form.expected_close_date} onChange={set("expected_close_date")} /></Field>
          <Field label="Chance (%)" hint="Blank: the stage's usual chance." error={fieldError(save.error, "probability")}><Input inputMode="numeric" value={form.probability} onChange={set("probability")} /></Field>
          {assignees.length > 0 && (
            <Field label="Who is working it"><Select value={form.assigned_to_id} onChange={set("assigned_to_id")}><option value="">Nobody yet</option>{assignees.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
          )}
        </div>
        <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={set("notes")} /></Field>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Save deal</Button></div>
      </form>
    </Modal>
  );
}
