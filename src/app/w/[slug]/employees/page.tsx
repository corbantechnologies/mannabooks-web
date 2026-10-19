"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { PayItemsEditor } from "@/components/pay-items";
import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import type { PayItem } from "@/lib/api/people";
import type { Employee } from "@/lib/api/types";
import { useWorkspace, wsPath } from "@/lib/workspace";

const EMPTY = {
  first_name: "", last_name: "", other_names: "", email: "", phone: "", national_id: "", kra_pin: "",
  job_title: "", department_id: "", branch_id: "", reports_to_id: "", hire_date: "", status: "active" as "active" | "on_leave" | "exited",
  on_payroll: false, basic_salary: "", pay_method: "bank" as "bank" | "mpesa" | "cash", bank_name: "", bank_account_number: "", mpesa_phone: "",
  nssf_number: "", shif_number: "", annual_leave_days: "21", recurring_items: [] as PayItem[],
};
type Form = typeof EMPTY;

function toForm(e: Employee): Form {
  return {
    first_name: e.first_name, last_name: e.last_name, other_names: e.other_names ?? "", email: e.email ?? "", phone: e.phone ?? "",
    national_id: e.national_id ?? "", kra_pin: e.kra_pin ?? "", job_title: e.job_title ?? "", department_id: e.department_id ?? "",
    branch_id: e.branch_id ?? "", reports_to_id: e.reports_to_id ?? "", hire_date: e.hire_date ?? "", status: e.status ?? "active",
    on_payroll: e.on_payroll ?? false, basic_salary: e.basic_salary ? String(Number(e.basic_salary)) : "", pay_method: e.pay_method ?? "bank",
    bank_name: e.bank_name ?? "", bank_account_number: e.bank_account_number ?? "", mpesa_phone: e.mpesa_phone ?? "", nssf_number: e.nssf_number ?? "",
    shif_number: e.shif_number ?? "", annual_leave_days: String(Number(e.annual_leave_days ?? 21)), recurring_items: (e.recurring_items as PayItem[] | undefined) ?? [],
  };
}

const STATUS_TONE = { active: "green", on_leave: "amber", exited: "stone" } as const;

export default function EmployeesPage() {
  const { slug, can } = useWorkspace();
  const p = wsPath(slug);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Employee | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const manage = can("employees.manage");
  const viewAll = can("employees.view");

  const list = useQuery({
    queryKey: ["employees", slug, search],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/employees/", { params: { path: { workspace: slug }, query: { search: search || undefined, page_size: 200 } } })),
  });
  const departments = useQuery({ queryKey: ["departments", slug], enabled: manage, queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/departments/", p)) });
  const branches = useQuery({ queryKey: ["branches", slug], enabled: manage, queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/branches/", p)) });

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        ...form,
        department_id: form.department_id || null,
        branch_id: form.branch_id || null,
        reports_to_id: form.reports_to_id || null,
        hire_date: form.hire_date || null,
        basic_salary: form.basic_salary || "0",
        ...(can("payroll.manage") ? {} : { on_payroll: undefined, basic_salary: undefined, recurring_items: undefined, pay_method: undefined, annual_leave_days: undefined }),
      } as never;
      if (editing === "new") return unwrap(await api.POST("/api/v1/w/{workspace}/employees/", { ...p, body }));
      const id = (editing as Employee).id;
      return unwrap(await api.PATCH("/api/v1/w/{workspace}/employees/{id}/", { params: { path: { workspace: slug, id } }, body }));
    },
    onSuccess: (emp) => { toast.success(`${emp.full_name} saved`); setEditing(null); },
  });
  const invite = useMutation({
    mutationFn: async (id: string) => unwrap(await api.POST("/api/v1/w/{workspace}/employees/{id}/invite/", { params: { path: { workspace: slug, id } }, body: {} })),
    onSuccess: (inv) => toast.success(`Invitation sent to ${inv.email}`),
    onError: (e) => toast.error(e.message),
  });

  function open(e: Employee | "new") {
    save.reset();
    setForm(e === "new" ? EMPTY : toForm(e));
    setEditing(e);
  }
  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const rows = list.data?.results ?? [];
  const current = editing !== "new" && editing !== null ? editing : null;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={viewAll ? "Employees" : "My employee record"}
        description={viewAll ? "Everyone who works here. Link an employee to a login so they can use self-service." : "Your details as HR has them. Ask HR to correct anything wrong."}
        guide="employees"
        actions={manage && <Button onClick={() => open("new")}><Plus className="h-4 w-4" /> New employee</Button>}
      />
      {viewAll && (
        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <Input className="pl-9" placeholder="Search name, staff number, phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title={search ? "No employees match" : "No employees yet"} />
        ) : (
          <Table head={["Staff no.", "Name", "Job title", "Department", "Reports to", "Login", "Status"]}>
            {rows.map((e) => (
              <tr key={e.id} className={manage ? "cursor-pointer hover:bg-stone-50" : ""} onClick={() => manage && open(e)}>
                <Td className="font-mono text-xs">{e.staff_number}</Td>
                <Td className="font-medium">{e.full_name}</Td>
                <Td>{e.job_title || "-"}</Td>
                <Td>{e.department_name || "-"}</Td>
                <Td>{e.reports_to_name || "-"}</Td>
                <Td>{e.has_login ? <Badge tone="green">Yes</Badge> : <Badge>No</Badge>}</Td>
                <Td><Badge tone={STATUS_TONE[e.status ?? "active"]}>{(e.status ?? "active").replace("_", " ")}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={editing !== null} title={current ? `${current.full_name} (${current.staff_number})` : "New employee"} onClose={() => setEditing(null)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" error={fieldError(save.error, "first_name")}><Input required value={form.first_name} onChange={set("first_name")} /></Field>
            <Field label="Last name" error={fieldError(save.error, "last_name")}><Input required value={form.last_name} onChange={set("last_name")} /></Field>
            <Field label="Email" error={fieldError(save.error, "email")}><Input type="email" value={form.email} onChange={set("email")} /></Field>
            <Field label="Phone" error={fieldError(save.error, "phone")}><Input value={form.phone} onChange={set("phone")} /></Field>
            <Field label="National ID" error={fieldError(save.error, "national_id")}><Input value={form.national_id} onChange={set("national_id")} /></Field>
            <Field label="KRA PIN" error={fieldError(save.error, "kra_pin")}><Input value={form.kra_pin} onChange={set("kra_pin")} /></Field>
            <Field label="Job title" error={fieldError(save.error, "job_title")}><Input value={form.job_title} onChange={set("job_title")} /></Field>
            <Field label="Hire date" error={fieldError(save.error, "hire_date")}><Input type="date" value={form.hire_date} onChange={set("hire_date")} /></Field>
            <Field label="Department" error={fieldError(save.error, "department_id")}>
              <Select value={form.department_id} onChange={set("department_id")}>
                <option value="">None</option>
                {(departments.data?.results ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
            <Field label="Branch" error={fieldError(save.error, "branch_id")}>
              <Select value={form.branch_id} onChange={set("branch_id")}>
                <option value="">None</option>
                {(branches.data?.results ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            <Field label="Reports to" error={fieldError(save.error, "reports_to_id")}>
              <Select value={form.reports_to_id} onChange={set("reports_to_id")}>
                <option value="">Nobody</option>
                {rows.filter((r) => r.id !== current?.id).map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}
              </Select>
            </Field>
            <Field label="Status" error={fieldError(save.error, "status")}>
              <Select value={form.status} onChange={set("status")}>
                <option value="active">Active</option>
                <option value="on_leave">On leave</option>
                <option value="exited">Exited</option>
              </Select>
            </Field>
          </div>
          {can("payroll.manage") && (
            <fieldset className="space-y-3 rounded-md border border-stone-200 p-3">
              <legend className="px-1 text-sm font-semibold">Pay</legend>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.on_payroll} onChange={(e) => setForm((p) => ({ ...p, on_payroll: e.target.checked }))} /> Paid through payroll</label>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Basic salary (a month)" error={fieldError(save.error, "basic_salary")}><Input inputMode="decimal" value={form.basic_salary} onChange={set("basic_salary")} /></Field>
                <Field label="Annual leave days"><Input inputMode="decimal" value={form.annual_leave_days} onChange={set("annual_leave_days")} /></Field>
                <Field label="Paid by"><Select value={form.pay_method} onChange={set("pay_method")}><option value="bank">Bank transfer</option><option value="mpesa">M-Pesa</option><option value="cash">Cash</option></Select></Field>
                {form.pay_method === "bank" && <Field label="Bank"><Input value={form.bank_name} onChange={set("bank_name")} /></Field>}
                {form.pay_method === "bank" && <Field label="Account number"><Input value={form.bank_account_number} onChange={set("bank_account_number")} /></Field>}
                {form.pay_method === "mpesa" && <Field label="M-Pesa number"><Input value={form.mpesa_phone} onChange={set("mpesa_phone")} /></Field>}
                <Field label="NSSF number"><Input value={form.nssf_number} onChange={set("nssf_number")} /></Field>
                <Field label="SHIF number"><Input value={form.shif_number} onChange={set("shif_number")} /></Field>
              </div>
              <PayItemsEditor items={form.recurring_items} onChange={(items) => setForm((p) => ({ ...p, recurring_items: items }))} hint="Every month, e.g. house allowance, SACCO." />
              {fieldError(save.error, "recurring_items") && <p className="text-sm text-red-600">{fieldError(save.error, "recurring_items")}</p>}
            </fieldset>
          )}
          <FormError error={save.error} />
          <div className="flex flex-wrap justify-between gap-2">
            {current && !current.has_login && can("invitations.manage") ? (
              <Button type="button" variant="secondary" loading={invite.isPending} disabled={!current.email} title={current.email ? "" : "Add an email first"} onClick={() => invite.mutate(current.id)}>
                Invite to sign in
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" loading={save.isPending}>Save</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
