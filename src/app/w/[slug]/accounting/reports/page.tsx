"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Card, PageHeader } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";

const REPORTS = [
  { href: "/accounting/reports/profit-and-loss", title: "Profit and loss", text: "Income less costs for a period. Compare with last period or last year; filter by cost centre, project or branch." },
  { href: "/accounting/reports/balance-sheet", title: "Balance sheet", text: "What the business owns and owes on a date, and the owners' share." },
  { href: "/accounting/trial-balance", title: "Trial balance", text: "Every account's balance on a date, proving debits equal credits." },
  { href: "/accounting/reports/aged-receivables", title: "Aged receivables", text: "Who owes you, grouped by how late they are." },
  { href: "/accounting/reports/aged-payables", title: "Aged payables", text: "What you owe suppliers, grouped by how long it has been due." },
  { href: "/accounting/reports/vat", title: "VAT summary", text: "Sales and purchases by VAT rate for your monthly VAT return on iTax." },
  { href: "/accounting/reports/by-category", title: "Sales and stock by category", text: "Which product categories sell most, and the stock value you hold in each." },
  { href: "/accounting/budgets", title: "Budget vs actual", text: "How each account is doing against the year's plan.", perm: "budgets.view" },
  { href: "/projects", title: "Project profitability", text: "Income, costs and profit for each job or contract.", perm: "projects.view" },
];

export default function ReportsPage() {
  const { slug, can } = useWorkspace();
  return (
    <div className="w-full">
      <PageHeader title="Reports" description="The financial statements and the reports you need for KRA, the bank and running the business." guide="financial-reports" />
      <div className="grid gap-3 sm:grid-cols-2">
        {REPORTS.filter((r) => !r.perm || can(r.perm)).map((r) => (
          <Link key={r.href} href={`/w/${slug}${r.href}`}>
            <Card className="h-full p-4 transition-colors hover:border-brand-300">
              <p className="flex items-center justify-between font-medium text-stone-900">{r.title} <ArrowRight className="h-4 w-4 text-stone-400" /></p>
              <p className="mt-1 text-sm text-stone-600">{r.text}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
