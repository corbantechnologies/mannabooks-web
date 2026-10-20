"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";

import { PeriodDashboard } from "@/components/period-dashboard";
import { Badge, Card, PageHeader } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function OverviewPage() {
  const { slug, context, can } = useWorkspace();
  const p = wsPath(slug);
  const departments = useQuery({
    queryKey: ["departments", slug],
    enabled: can("departments.view"),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/departments/", p)),
  });
  const employees = useQuery({
    queryKey: ["employees", slug],
    enabled: can("employees.view"),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/employees/", p)),
  });
  const members = useQuery({
    queryKey: ["members", slug],
    enabled: can("members.view"),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/members/", p)),
  });

  const payOptions = useQuery({
    queryKey: ["payment-options", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/payment-options/", { params: { path: { workspace: slug } } })),
  });
  const ws = context.workspace;
  const steps = [
    { done: Boolean(ws.kra_pin), label: "Add your KRA PIN and business details", href: "/settings", show: can("workspace.manage") },
    { done: (payOptions.data ?? []).length > 0, label: "Add how customers pay you (paybill, till or bank)", href: "/settings", show: can("workspace.manage") },
    { done: (departments.data?.count ?? 0) > 0, label: "Create departments and choose their heads", href: "/departments", show: can("departments.manage") },
    { done: (employees.data?.count ?? 0) > 0, label: "Add your employees", href: "/employees", show: can("employees.manage") },
    { done: (members.data?.count ?? 0) > 1, label: "Invite your team", href: "/team", show: can("invitations.manage") },
  ].filter((s) => s.show);
  const remaining = steps.filter((s) => !s.done);

  return (
    <div className="max-w-6xl">
      <PageHeader title={ws.name} description={`You are signed in as ${context.role}.`} guide="getting-started" />

      {remaining.length > 0 && (
        <Card className="mb-6 p-5">
          <h2 className="font-semibold text-stone-900">Set up {ws.name}</h2>
          <p className="mt-1 text-sm text-stone-600">
            {steps.length - remaining.length} of {steps.length} done. This list disappears once everything is set up.
          </p>
          <ul className="mt-4 space-y-2">
            {steps.map((step) => (
              <li key={step.href}>
                <Link href={`/w/${slug}${step.href}`} className="flex items-center gap-2.5 text-sm hover:underline">
                  {step.done ? <CheckCircle2 className="h-4 w-4 text-brand-600" /> : <Circle className="h-4 w-4 text-stone-300" />}
                  <span className={step.done ? "text-stone-400 line-through" : "text-stone-800"}>{step.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {context.unclosed_years.length > 0 && can("fiscalyears.manage") && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {context.unclosed_years.join(", ")} {context.unclosed_years.length === 1 ? "has" : "have"} ended but {context.unclosed_years.length === 1 ? "is" : "are"} not closed yet.
          Everything still works; close the year once your accountant has finalised the books.{" "}
          <Link href={`/w/${slug}/accounting/years`} className="font-medium underline">Financial years</Link>
        </div>
      )}

      {can("reports.view") && <div className="mb-8"><PeriodDashboard /></div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-stone-900">Your role</h2>
          <p className="mt-2 text-sm text-stone-700">{context.role}</p>
          {context.department && <p className="mt-1 text-sm text-stone-500">Department: {context.department}</p>}
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-stone-900">You are in charge of</h2>
          {context.in_charge_of.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {context.in_charge_of.map((m) => (
                <Badge key={m} tone="green">
                  {m}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-stone-500">No modules. Department heads are in charge of the modules their department runs.</p>
          )}
        </Card>
      </div>

    </div>
  );
}
