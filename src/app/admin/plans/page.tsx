"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt } from "@/lib/format";

const MODULES = ["sales", "pos", "store", "purchasing", "inventory", "manufacturing", "banking", "people", "projects", "crm", "control"];
type Plan = { id: string; key: string; name: string; description?: string; price_monthly?: string; price_yearly?: string; modules?: unknown; features?: unknown; max_users?: number | null; max_documents_month?: number | null; payroll_per_employee?: string; payroll_minimum?: string; is_free?: boolean; is_public?: boolean; is_active?: boolean };

export default function PlansPage() {
  const plans = useQuery({ queryKey: ["platform-plans"], queryFn: async () => unwrap(await api.GET("/api/v1/platform/plans/")) });
  const [editing, setEditing] = useState<Plan | null>(null);
  if (plans.isLoading) return <Spinner />;
  if (plans.error) return <ErrorState error={plans.error} />;
  return (
    <div className="w-full">
      <PageHeader title="Plans and prices" description="What each plan costs and includes. A new price applies from each business's next payment; nobody is charged more mid-period." />
      <Card>
        <Table head={["Plan", "Monthly", "Yearly", "Team", "Documents a month", "Payroll add-on", "Modules", ""]}>
          {(plans.data as Plan[]).map((p) => (
            <tr key={p.id}>
              <Td><span className="font-medium">{p.name}</span> <span className="font-mono text-xs text-stone-500">{p.key}</span>{!p.is_public && <Badge>Hidden</Badge>}{!p.is_active && <Badge tone="red">Off</Badge>}</Td>
              <Td className="text-right font-mono">{fmt(p.price_monthly)}</Td>
              <Td className="text-right font-mono">{fmt(p.price_yearly)}</Td>
              <Td className="text-right">{p.max_users ?? "Any"}</Td>
              <Td className="text-right">{p.max_documents_month ?? "Any"}</Td>
              <Td className="text-right font-mono text-xs">{Number(p.payroll_per_employee) ? `${fmt(p.payroll_per_employee)}/employee, min ${fmt(p.payroll_minimum)}` : "-"}</Td>
              <Td className="max-w-64 text-xs text-stone-600">{((p.modules as string[]) ?? []).join(", ")}</Td>
              <Td><button type="button" className="text-xs text-brand-700 hover:underline" onClick={() => setEditing(p)}>Edit</button></Td>
            </tr>
          ))}
        </Table>
      </Card>
      {editing && <EditPlan plan={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditPlan({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const [f, setF] = useState({
    name: plan.name, description: plan.description ?? "", price_monthly: String(Number(plan.price_monthly ?? 0)), price_yearly: String(Number(plan.price_yearly ?? 0)),
    max_users: plan.max_users != null ? String(plan.max_users) : "", max_documents_month: plan.max_documents_month != null ? String(plan.max_documents_month) : "",
    payroll_per_employee: String(Number(plan.payroll_per_employee ?? 0)), payroll_minimum: String(Number(plan.payroll_minimum ?? 0)),
    modules: (plan.modules as string[]) ?? [], is_public: plan.is_public ?? true, is_active: plan.is_active ?? true,
  });
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PATCH("/api/v1/platform/plans/{id}/", { params: { path: { id: plan.id } }, body: {
      ...f, max_users: f.max_users ? Number(f.max_users) : null, max_documents_month: f.max_documents_month ? Number(f.max_documents_month) : null,
    } as never })),
    onSuccess: () => { toast.success("Plan saved"); onClose(); },
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  return (
    <Modal size="lg" open title={`Edit ${plan.name}`} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name"><Input required value={f.name} onChange={set("name")} /></Field>
          <Field label="Description"><Input value={f.description} onChange={set("description")} /></Field>
          <Field label="Monthly (KES, VAT included)"><Input inputMode="decimal" value={f.price_monthly} onChange={set("price_monthly")} /></Field>
          <Field label="Yearly (KES)"><Input inputMode="decimal" value={f.price_yearly} onChange={set("price_yearly")} /></Field>
          <Field label="Team members" hint="Blank: any. Accountants and self-service staff are free."><Input inputMode="numeric" value={f.max_users} onChange={set("max_users")} /></Field>
          <Field label="Documents a month" hint="Blank: any"><Input inputMode="numeric" value={f.max_documents_month} onChange={set("max_documents_month")} /></Field>
          <Field label="Payroll per employee (KES)"><Input inputMode="decimal" value={f.payroll_per_employee} onChange={set("payroll_per_employee")} /></Field>
          <Field label="Payroll minimum (KES)"><Input inputMode="decimal" value={f.payroll_minimum} onChange={set("payroll_minimum")} /></Field>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-stone-700">Modules</p>
          <div className="flex flex-wrap gap-3 text-sm">
            {MODULES.map((m) => <label key={m} className="flex items-center gap-1.5"><input type="checkbox" checked={f.modules.includes(m)} onChange={(e) => setF((p) => ({ ...p, modules: e.target.checked ? [...p.modules, m] : p.modules.filter((x) => x !== m) }))} /> {m}</label>)}
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_public} onChange={(e) => setF((p) => ({ ...p, is_public: e.target.checked }))} /> Shown on the pricing page</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_active} onChange={(e) => setF((p) => ({ ...p, is_active: e.target.checked }))} /> Available</label>
        </div>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
      </form>
    </Modal>
  );
}
