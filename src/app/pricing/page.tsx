"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { api, unwrap } from "@/lib/api/client";
import { fmt } from "@/lib/format";
import { FALLBACK_PLANS, MODULE_LABEL, type PublicPlan } from "@/lib/plans";

/** The public pricing page: plans come from the API, so prices set in the MannaBooks admin show here; until it answers, the seeded plans show. */
export default function PricingPage() {
  const [yearly, setYearly] = useState(false);
  const plans = useQuery({ queryKey: ["public-plans"], queryFn: async () => unwrap(await api.GET("/api/v1/plans/")) });
  const list = (plans.data?.length ? plans.data : FALLBACK_PLANS) as PublicPlan[];
  return (
    <div className="min-h-screen bg-white text-stone-800">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14">
        <h1 className="text-center text-4xl font-bold tracking-tight text-stone-900">Simple prices in shillings</h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-stone-600">Start free. Every new business gets 30 days of every feature, then chooses a plan or stays on Free. Pay monthly or yearly by M-Pesa. Prices include VAT.</p>
        <div className="mt-6 flex justify-center">
          <div className="inline-flex rounded-md border border-stone-200 p-0.5 text-sm">
            <button type="button" onClick={() => setYearly(false)} className={`rounded px-4 py-1.5 ${!yearly ? "bg-brand-50 font-medium text-brand-700" : "text-stone-600"}`}>Monthly</button>
            <button type="button" onClick={() => setYearly(true)} className={`rounded px-4 py-1.5 ${yearly ? "bg-brand-50 font-medium text-brand-700" : "text-stone-600"}`}>Yearly (2 months free)</button>
          </div>
        </div>
        {(
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {list.map((p) => {
              const modules = (p.modules as string[]) ?? [];
              const popular = p.key === "duka";
              return (
                <div key={p.key} className={`flex flex-col rounded-xl border p-6 ${popular ? "border-brand-600 ring-2 ring-brand-600" : "border-stone-200"}`}>
                  {popular && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">Most popular</p>}
                  <h2 className="text-lg font-semibold text-stone-900">{p.name}</h2>
                  <p className="mt-1 min-h-10 text-sm text-stone-600">{p.description}</p>
                  <p className="mt-4">
                    <span className="text-3xl font-bold text-stone-900">{p.is_free ? "KES 0" : `KES ${fmt(yearly ? p.price_yearly : p.price_monthly).replace(".00", "")}`}</span>
                    <span className="text-sm text-stone-500">{p.is_free ? " forever" : yearly ? " a year" : " a month"}</span>
                  </p>
                  <ul className="mt-5 flex-1 space-y-2 text-sm text-stone-700">
                    <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{p.max_users ? `${p.max_users} team member${p.max_users === 1 ? "" : "s"}` : "Unlimited team"}; accountants free</li>
                    <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{p.max_documents_month ? `${p.max_documents_month} documents a month` : "Unlimited documents"}</li>
                    {modules.map((m) => <li key={m} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{MODULE_LABEL[m] ?? m}</li>)}
                    {((p.features as string[]) ?? []).includes("company_groups") && <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />Company groups and consolidation</li>}
                    {modules.includes("people") && Number(p.payroll_per_employee) > 0 && <li className="text-xs text-stone-500">Payroll: KES {Number(p.payroll_per_employee)} per employee a month (from KES {Number(p.payroll_minimum)})</li>}
                  </ul>
                  <Link href="/signup" className={`mt-6 inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium ${popular ? "bg-brand-700 text-white hover:bg-brand-600" : "border border-stone-300 text-stone-800 hover:bg-stone-50"}`}>
                    {p.is_free ? "Start free" : "Start your free trial"} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 text-sm text-stone-600 sm:grid-cols-2">
          <p><strong className="text-stone-900">Your data is always yours.</strong> If a payment is missed, the business stays readable and exportable; nothing is deleted.</p>
          <p><strong className="text-stone-900">Discounts.</strong> 25% for registered NGOs and churches. Accountants who bring clients get free seats in their clients&apos; workspaces.</p>
          <p><strong className="text-stone-900">KRA ready.</strong> VAT, withholding tax, statutory payroll and eTIMS signing (once KRA approves MannaBooks) on every plan that needs them.</p>
          <p><strong className="text-stone-900">Questions?</strong> <Link className="underline" href="/contact?topic=sales">Talk to us</Link>, use Help and feedback inside MannaBooks, or <Link className="underline" href="/guide">read the guides</Link>.</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
