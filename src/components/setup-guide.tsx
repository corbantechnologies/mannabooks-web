"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

import { api, unwrap } from "@/lib/api/client";
import { MONTHS } from "@/lib/api/people";
import { useWorkspace } from "@/lib/workspace";

import { Button, Card, Select } from "./ui";

interface Goal { key: string; label: string; description: string; modules: string[] }

/** How many records a list endpoint has (page_size 1 keeps it light). Arrays count their length. */
function useCount(slug: string, path: string, enabled = true) {
  return useQuery({
    queryKey: ["setup-count", slug, path],
    enabled,
    queryFn: async () => {
      const res = await fetch(`/api/backend/api/v1/w/${slug}/${path}${path.includes("?") ? "&" : "?"}page_size=1`);
      if (!res.ok) return 0;
      const data = await res.json();
      return Array.isArray(data) ? data.length : (data.count ?? 0);
    },
  });
}

type Step = { key: string; label: string; href: string; done: boolean; /** Shown beside the label instead of a link, while not done. */ control?: React.ReactNode };

/**
 * New businesses first choose what they want to do; that switches on the right modules and gives a short
 * checklist for that goal. The checklist ticks itself off and disappears when everything is done.
 */
export function SetupGuide() {
  const { slug, context, can } = useWorkspace();
  const ws = context.workspace;
  const goals = (context.goal_catalog ?? []) as unknown as Goal[];
  const manage = can("workspace.manage");
  const goal = ws.business_goal ?? "";
  const choose = useMutation({
    mutationFn: async (key: string) => unwrap(await api.PATCH("/api/v1/w/{workspace}/", { params: { path: { workspace: slug } }, body: { business_goal: key } as never })),
    onSuccess: (_, key) => toast.success(`Set up for: ${goals.find((g) => g.key === key)?.label}. Change it any time in Settings.`),
  });
  const setYear = useMutation({
    // sending the month (even the same one) also marks it checked
    mutationFn: async (month: number) => unwrap(await api.PATCH("/api/v1/w/{workspace}/", { params: { path: { workspace: slug } }, body: { fiscal_year_start_month: month } as never })),
    onSuccess: (_, month) => toast.success(`Your financial year starts in ${MONTHS[month - 1]}.`),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't change the financial year."),
  });
  const n = {
    payOptions: useCount(slug, "payment-options/", Boolean(goal)),
    customers: useCount(slug, "customers/", ["invoicing", "projects", "everything"].includes(goal)),
    invoices: useCount(slug, "invoices/", ["invoicing", "projects", "everything"].includes(goal)),
    products: useCount(slug, "products/", ["shop", "stock", "manufacturing"].includes(goal)),
    shifts: useCount(slug, "pos/shifts/", goal === "shop"),
    receipts: useCount(slug, "goods-receipts/", goal === "stock"),
    projects: useCount(slug, "projects/", goal === "projects"),
    recipes: useCount(slug, "bills-of-materials/", goal === "manufacturing"),
    production: useCount(slug, "production-orders/", goal === "manufacturing"),
    employees: useCount(slug, "employees/", ["payroll", "everything"].includes(goal)),
    payruns: useCount(slug, "pay-runs/", goal === "payroll"),
    members: useCount(slug, "members/", goal === "everything"),
    journals: useCount(slug, "journals/", Boolean(goal)),  // the start month locks once anything is posted
  };
  const has = (q: { data?: number }) => (q.data ?? 0) > 0;
  const startMonth = ws.fiscal_year_start_month ?? 1;
  const yearDone = has(n.journals) || Boolean(ws.fiscal_year_confirmed);
  const year: Step = {
    key: "year", href: "/settings", done: yearDone,
    label: yearDone ? `Financial year starts in ${MONTHS[startMonth - 1]}` : "Check when your financial year starts (it can't change once you record anything)",
    control: (
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-40">
          <Select aria-label="Financial year starts in" className="py-1 text-sm" value={startMonth} disabled={setYear.isPending}
            onChange={(e) => setYear.mutate(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </Select>
        </div>
        <Button variant="secondary" className="py-1" loading={setYear.isPending} onClick={() => setYear.mutate(startMonth)}>{MONTHS[startMonth - 1]} is right</Button>
      </div>
    ),
  };
  const details: Step = { key: "details", label: "Add your KRA PIN and business details", href: "/settings", done: Boolean(ws.kra_pin) };
  const pay: Step = { key: "pay", label: "Add how customers pay you (paybill, till or bank)", href: "/settings", done: has(n.payOptions) };
  const plans: Record<string, Step[]> = {
    invoicing: [year, details, pay,
      { key: "customer", label: "Add your first customer", href: "/sales/customers", done: has(n.customers) },
      { key: "invoice", label: "Create an invoice and send it by email", href: "/sales/invoices/new", done: has(n.invoices) }],
    shop: [year, details, pay,
      { key: "products", label: "Add your products, with the stock you have", href: "/sales/products", done: has(n.products) },
      { key: "till", label: "Open a till shift and make a sale", href: "/pos", done: has(n.shifts) }],
    stock: [year, details,
      { key: "products", label: "Add your products, with the stock you have", href: "/sales/products", done: has(n.products) },
      { key: "receive", label: "Record goods received from a supplier", href: "/purchasing/receipts/new", done: has(n.receipts) }],
    projects: [year, details, pay,
      { key: "customer", label: "Add a client", href: "/sales/customers", done: has(n.customers) },
      { key: "project", label: "Start a project", href: "/projects", done: has(n.projects) },
      { key: "invoice", label: "Invoice the client for the project", href: "/sales/invoices/new", done: has(n.invoices) }],
    manufacturing: [year, details,
      { key: "products", label: "Add your raw materials and finished products", href: "/sales/products", done: has(n.products) },
      { key: "recipe", label: "Write a recipe for a product", href: "/manufacturing/recipes", done: has(n.recipes) },
      { key: "production", label: "Record your first production", href: "/manufacturing/production", done: has(n.production) }],
    payroll: [year, details,
      { key: "employees", label: "Add your staff with their salaries", href: "/employees", done: has(n.employees) },
      { key: "payrun", label: "Run this month's payroll", href: "/payroll", done: has(n.payruns) }],
    everything: [year, details, pay,
      { key: "invoice", label: "Create your first invoice", href: "/sales/invoices/new", done: has(n.invoices) },
      { key: "employees", label: "Add your staff", href: "/employees", done: has(n.employees) },
      { key: "team", label: "Invite your team", href: "/team", done: (n.members.data ?? 0) > 1 }],
  };

  if (!goal) {
    if (!manage) return null;
    return (
      <Card className="mb-6 p-5">
        <h2 className="font-semibold text-stone-900">What do you want to do first?</h2>
        <p className="mt-1 text-sm text-stone-600">MannaBooks switches on just what you need. You can add the rest any time in Settings.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {goals.map((g) => (
            <button key={g.key} type="button" disabled={choose.isPending} onClick={() => choose.mutate(g.key)}
              className="rounded-lg border border-stone-200 p-4 text-left transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:opacity-60">
              <p className="font-medium text-stone-900">{g.label}</p>
              <p className="mt-1 text-xs text-stone-600">{g.description}</p>
            </button>
          ))}
        </div>
      </Card>
    );
  }
  const steps = plans[goal] ?? plans.everything;
  const left = steps.filter((s) => !s.done);
  if (!left.length || !manage) return null;
  return (
    <Card className="mb-6 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-stone-900">Set up {ws.name}: {goals.find((g) => g.key === goal)?.label.toLowerCase()}</h2>
          <p className="mt-1 text-sm text-stone-600">{steps.length - left.length} of {steps.length} done. This list disappears once everything is set up.</p>
        </div>
        <Link href={`/w/${slug}/settings`}><Button variant="ghost">Change goal or modules</Button></Link>
      </div>
      <ul className="mt-4 space-y-2">
        {steps.map((step) => (
          <li key={step.key}>
            {step.control && !step.done ? (
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm">
                <Circle className="h-4 w-4 shrink-0 text-stone-300" />
                <span className="text-stone-800">{step.label}</span>
                {step.control}
              </div>
            ) : (
              <Link href={`/w/${slug}${step.href}`} className="flex items-center gap-2.5 text-sm hover:underline">
                {step.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" /> : <Circle className="h-4 w-4 shrink-0 text-stone-300" />}
                <span className={step.done ? "text-stone-400 line-through" : "text-stone-800"}>{step.label}</span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
