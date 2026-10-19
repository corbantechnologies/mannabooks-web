"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Field, FormError, Input, Select, Textarea } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { PROJECT_STATUS, type Project } from "@/lib/api/control";
import { useCustomers } from "@/lib/api/sales";
import { useWorkspace } from "@/lib/workspace";

export function ProjectForm({ existing, onDone }: { existing?: Project; onDone: () => void }) {
  const { slug } = useWorkspace();
  const router = useRouter();
  const customers = useCustomers(slug);
  const staff = useQuery({
    queryKey: ["employees", slug, "picker"],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/employees/", { params: { path: { workspace: slug }, query: { page_size: 200 } } })),
  });
  const [f, setF] = useState({
    code: existing?.code ?? "", name: existing?.name ?? "", customer_id: existing?.customer_id ?? "", manager_id: existing?.manager_id ?? "",
    status: existing?.status ?? "active", start_date: existing?.start_date ?? "", end_date: existing?.end_date ?? "",
    contract_value: existing?.contract_value ?? "0", cost_budget: existing?.cost_budget ?? "0", description: existing?.description ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const save = useMutation({
    mutationFn: async () => {
      const body = { ...f, customer_id: f.customer_id || null, manager_id: f.manager_id || null, start_date: f.start_date || null, end_date: f.end_date || null };
      return existing
        ? unwrap(await api.PATCH("/api/v1/w/{workspace}/projects/{id}/", { params: { path: { workspace: slug, id: existing.id } }, body: body as never }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/projects/", { params: { path: { workspace: slug } }, body: body as never }));
    },
    onSuccess: (p) => { toast.success(`${p.code} saved`); onDone(); if (!existing) router.push(`/w/${slug}/projects/${p.id}`); },
  });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Code" hint="Blank: numbered for you." error={fieldError(save.error, "code")}><Input value={f.code} onChange={set("code")} placeholder="PRJ-0001" /></Field>
        <div className="sm:col-span-2"><Field label="Name" error={fieldError(save.error, "name")}><Input required value={f.name} onChange={set("name")} placeholder="Kitengela warehouse fit-out" /></Field></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Customer"><Select value={f.customer_id} onChange={set("customer_id")}><option value="">None (internal)</option>{(customers.data?.results ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Project manager"><Select value={f.manager_id} onChange={set("manager_id")}><option value="">None</option>{(staff.data?.results ?? []).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</Select></Field>
        <Field label="Contract value" hint="What the customer pays, before VAT."><Input type="number" min="0" step="0.01" value={f.contract_value} onChange={set("contract_value")} /></Field>
        <Field label="Cost budget" hint="What the job should cost."><Input type="number" min="0" step="0.01" value={f.cost_budget} onChange={set("cost_budget")} /></Field>
        <Field label="Start"><Input type="date" value={f.start_date} onChange={set("start_date")} /></Field>
        <Field label="End" error={fieldError(save.error, "end_date")}><Input type="date" value={f.end_date} onChange={set("end_date")} /></Field>
        {existing && <Field label="Status"><Select value={f.status} onChange={set("status")}>{Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>}
      </div>
      <Field label="Description"><Textarea rows={2} value={f.description} onChange={set("description")} /></Field>
      <FormError error={save.error} />
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onDone}>Cancel</Button><Button type="submit" loading={save.isPending}>Save project</Button></div>
    </form>
  );
}
