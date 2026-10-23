"use client";

import Link from "next/link";

import { PeriodDashboard } from "@/components/period-dashboard";
import { SetupGuide } from "@/components/setup-guide";
import { Badge, Card, PageHeader } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";

export default function OverviewPage() {
  const { slug, context, can } = useWorkspace();
  const ws = context.workspace;

  return (
    <div className="w-full">
      <PageHeader title={ws.name} description={`You are signed in as ${context.role}.`} guide="getting-started" />

      <SetupGuide />

      {context.unclosed_years.length > 0 && can("fiscalyears.manage") && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {context.unclosed_years.join(", ")} {context.unclosed_years.length === 1 ? "has" : "have"} ended but {context.unclosed_years.length === 1 ? "is" : "are"} not closed yet.
          Everything still works; close the year once your accountant has finalised the books.{" "}
          <Link href={`/w/${slug}/accounting/years`} className="font-medium underline">Financial years</Link>
        </div>
      )}

      {can("reports.view") && !context.limited_department && <div className="mb-8"><PeriodDashboard /></div>}
      {can("reports.view") && context.limited_department && (
        <Link href={`/w/${slug}/accounting/reports/by-department`} className="mb-8 block rounded-lg border border-stone-200 bg-white p-4 text-sm hover:border-brand-300">
          <span className="font-medium text-stone-900">{context.limited_department.name}: profit and loss</span>
          <span className="mt-1 block text-stone-600">You see {context.limited_department.name}&apos;s documents and reports. Open its profit and loss &rarr;</span>
        </Link>
      )}

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
