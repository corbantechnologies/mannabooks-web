"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { api, fieldError, unwrap } from "@/lib/api/client";
import { useCustomers } from "@/lib/api/sales";
import { useWorkspace, wsPath } from "@/lib/workspace";

import { Button, Field, FormError, Input, Modal, Select } from "./ui";

export function EnrolModal({ onClose, customerId }: { onClose: () => void; customerId?: string }) {
  const { slug } = useWorkspace();
  const customers = useCustomers(slug);
  const [form, setForm] = useState({ customer_id: customerId ?? "", card_number: "" });
  const enrol = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/loyalty/members/", { ...wsPath(slug), body: form })),
    onSuccess: (m) => { toast.success(`${m.customer_name} enrolled, card ${m.card_number}`); onClose(); },
  });
  return (
    <Modal open title="Enrol a customer" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); enrol.mutate(); }}>
        <Field label="Customer" error={fieldError(enrol.error, "customer_id")} hint="A walk-in buyer? Add them as a customer with their phone number first.">
          <Select required value={form.customer_id} disabled={Boolean(customerId)} onChange={(e) => setForm((prev) => ({ ...prev, customer_id: e.target.value }))}>
            <option value="">Choose a customer</option>
            {(customers.data?.results ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>)}
          </Select>
        </Field>
        <Field label="Card number" error={fieldError(enrol.error, "card_number")} hint="Blank: MannaBooks numbers it (LC-000001). Or scan a printed card."><Input value={form.card_number} onChange={(e) => setForm((prev) => ({ ...prev, card_number: e.target.value }))} /></Field>
        <FormError error={enrol.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={enrol.isPending}>Enrol</Button></div>
      </form>
    </Modal>
  );
}
