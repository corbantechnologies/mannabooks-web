"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, Field, FormError, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useCostCenters } from "@/lib/api/control";
import { useAssignees } from "@/lib/api/crm";
import { useSuppliers } from "@/lib/api/purchasing";
import type { components } from "@/lib/api/schema";
import { useWorkspace, wsPath } from "@/lib/workspace";

type Item = components["schemas"]["RegisterItem"];
type Register = components["schemas"]["RegisterType"];

export const CYCLES = [["monthly", "Monthly"], ["quarterly", "Every 3 months"], ["half_yearly", "Every 6 months"], ["yearly", "Yearly"], ["one_off", "One-off"]] as const;

/** Adding or changing an item in a register: a page, since it has the core, the people using it and the register's own fields. */
export function RegisterItemForm({ register, item }: { register: Register; item?: Item }) {
  const { slug, can } = useWorkspace();
  const router = useRouter();
  const suppliers = useSuppliers(slug);
  const centres = useCostCenters(slug);
  const people = useAssignees(slug);
  const depts = useQuery({ queryKey: ["departments", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/departments/", wsPath(slug))) });
  const manager = can("registers.manage");
  const [f, setF] = useState({
    name: item?.name ?? "", status: item?.status ?? "active", supplier_id: item?.supplier_id ?? "", cost: item?.cost ?? "", cost_cycle: item?.cost_cycle ?? "yearly",
    renewal_date: item?.renewal_date ?? "", auto_renews: item?.auto_renews ?? true, remind_days: String(item?.remind_days ?? 14), owner_id: item?.owner_id ?? "",
    seats: item?.seats != null ? String(item.seats) : "", cost_center_id: item?.cost_center_id ?? "", notes: item?.notes ?? "",
  });
  const [deptIds, setDeptIds] = useState<string[]>(item?.departments.map((d) => d.id) ?? []);
  const [userIds, setUserIds] = useState<string[]>(item?.users.map((u) => u.id) ?? []);
  const [values, setValues] = useState<Record<string, string>>(item?.values ?? {});
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const toggle = (list: string[], setList: (v: string[]) => void, id: string) => setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name: f.name, status: f.status, supplier_id: f.supplier_id || null, cost: f.cost || "0", cost_cycle: f.cost_cycle, renewal_date: f.renewal_date || null,
        auto_renews: f.auto_renews, remind_days: Number(f.remind_days || 0), seats: f.seats === "" ? null : Number(f.seats), cost_center_id: f.cost_center_id || null,
        notes: f.notes, department_ids: deptIds, user_ids: userIds, values, ...(manager ? { owner_id: f.owner_id || null } : {}),
      } as never;
      return item
        ? unwrap(await api.PATCH("/api/v1/w/{workspace}/registers/items/{id}/", { params: { path: { workspace: slug, id: item.id } }, body }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/registers/items/", { params: { path: { workspace: slug }, query: { register: register.id } }, body }));
    },
    onSuccess: (r) => { toast.success("Saved"); router.push(`/w/${slug}/registers/items/${r.id}`); },
  });
  const money = item ? item.money_shown : true;
  return (
    <div className="w-full">
      <PageHeader title={item ? `Change ${item.name}` : `Add to ${register.name}`} guide="registers" />
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Card className="space-y-3 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Name"><Input required maxLength={160} value={f.name} onChange={set("name")} placeholder="e.g. Canva" /></Field>
            <Field label="Supplier"><Select value={f.supplier_id} onChange={set("supplier_id")}><option value="">None</option>{(suppliers.data?.results ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
            <Field label="Responsible" hint={manager ? "Reminded about renewals; decides who gets access" : "Only someone who manages registers changes this"}>
              <Select value={f.owner_id} onChange={set("owner_id")} disabled={!manager}><option value="">Nobody (register managers)</option>{people.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</Select>
            </Field>
            {item && <Field label="Status"><Select value={f.status} onChange={set("status")}><option value="active">Active</option><option value="ended">Ended (kept for the record)</option></Select></Field>}
          </div>
        </Card>
        <Card className="space-y-3 p-4 sm:p-5">
          <h2 className="text-sm font-semibold">Cost and renewal</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {money && <Field label="Cost"><Input type="number" inputMode="decimal" min="0" step="0.01" value={f.cost} onChange={set("cost")} /></Field>}
            <Field label="Paid"><Select value={f.cost_cycle} onChange={set("cost_cycle")}>{CYCLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            <Field label="Renews or expires on"><Input type="date" value={f.renewal_date} onChange={set("renewal_date")} /></Field>
            <Field label="Remind (days before)"><Input type="number" min="0" max="365" value={f.remind_days} onChange={set("remind_days")} /></Field>
            {money && <Field label="Cost centre"><Select value={f.cost_center_id} onChange={set("cost_center_id")}><option value="">None</option>{(centres.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.code} {c.name}</option>)}</Select></Field>}
            <label className="flex items-start gap-2 self-end text-sm"><input type="checkbox" className="mt-1" checked={f.auto_renews} onChange={(e) => setF({ ...f, auto_renews: e.target.checked })} />
              <span>Renews by itself<span className="block text-xs text-stone-500">Once the date passes, it moves on a cycle. Off: it expires and stays overdue until changed.</span></span></label>
          </div>
        </Card>
        {(register.fields ?? []).length > 0 && (
          <Card className="space-y-3 p-4 sm:p-5">
            <h2 className="text-sm font-semibold">{register.name} details</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(register.fields ?? []).map((fd) => (
                <Field key={fd.key} label={fd.label}>
                  {fd.kind === "choice" ? (
                    <Select value={values[fd.key ?? ""] ?? ""} onChange={(e) => setValues({ ...values, [fd.key ?? ""]: e.target.value })}><option value="">-</option>{(fd.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}</Select>
                  ) : (
                    <Input type={fd.kind === "number" ? "number" : fd.kind === "date" ? "date" : "text"} value={values[fd.key ?? ""] ?? ""}
                      onChange={(e) => setValues({ ...values, [fd.key ?? ""]: e.target.value })} />
                  )}
                </Field>
              ))}
            </div>
          </Card>
        )}
        <Card className="space-y-3 p-4 sm:p-5">
          <h2 className="text-sm font-semibold">Who uses it</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-stone-600">Departments</p>
              <div className="flex flex-wrap gap-2">
                {(depts.data?.results ?? []).map((d) => (
                  <label key={d.id} className="flex items-center gap-1.5 rounded border border-stone-200 px-2 py-1 text-sm"><input type="checkbox" checked={deptIds.includes(d.id)} onChange={() => toggle(deptIds, setDeptIds, d.id)} />{d.name}</label>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-stone-600">People with access{register.has_seats ? ` (${userIds.length}${f.seats ? ` of ${f.seats} seats` : ""})` : ""}</p>
              <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
                {people.map((p) => (
                  <label key={p.value} className="flex items-center gap-1.5 rounded border border-stone-200 px-2 py-1 text-sm"><input type="checkbox" checked={userIds.includes(p.value)} onChange={() => toggle(userIds, setUserIds, p.value)} />{p.label}</label>
                ))}
              </div>
            </div>
            {register.has_seats && <Field label="Seats bought" hint="Blank: not counted"><Input type="number" min="0" className="w-32" value={f.seats} onChange={set("seats")} /></Field>}
          </div>
        </Card>
        <Card className="p-4 sm:p-5"><Field label="Notes" hint="Never passwords: keep those in a password manager."><Textarea rows={3} value={f.notes} onChange={set("notes")} /></Field></Card>
        <FormError error={save.error} />
        <div className="sticky bottom-0 z-10 flex justify-end gap-2 rounded-lg border border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Save</Button>
        </div>
      </form>
    </div>
  );
}
