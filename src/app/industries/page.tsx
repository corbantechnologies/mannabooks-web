import { ArrowRight, Building2, ShoppingBasket, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { IndustryGrid } from "@/components/industry-grid";
import { CtaBand, Eyebrow, PublicPage } from "@/components/marketing";
import { USE_CASES } from "@/content/use-cases";

export const metadata: Metadata = {
  title: { absolute: "Industries: who MannaBooks is for" },
  description: "Shops, restaurants, distributors, manufacturers, contractors, clinics, schools, farms, transporters, consultants and NGOs across Kenya run their books, stock and payroll on MannaBooks.",
  alternates: { canonical: "/industries" },
};

const SIZES = [
  { icon: ShoppingBasket, title: "Just starting", text: "One person sending invoices and taking M-Pesa. Choose Send invoices and get paid and MannaBooks shows only that." },
  { icon: Store, title: "Growing", text: "A shop or office with a few staff, stock and suppliers. Switch on the till, stock and payroll when you need them." },
  { icon: Building2, title: "Established", text: "Several branches, departments and approval chains, budgets and fixed assets, and a group of companies reported together." },
];

export default function IndustriesPage() {
  return (
    <PublicPage>
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-4 pb-6 pt-14 sm:pt-20">
          <Eyebrow>Industries</Eyebrow>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">Built for the way Kenyan businesses work, whatever you do.</h1>
          <p className="mt-5 max-w-2xl text-lg text-stone-600">
            From a single shop to a group of companies, MannaBooks keeps your sales, M-Pesa, stock, payroll and books together. Pick your industry to see a day with MannaBooks and a worked example.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-6">
        <IndustryGrid />
      </section>

      <section className="border-t border-stone-100 bg-stone-50">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-stone-900">Or start from what you need to do</h2>
              <p className="mt-1 text-stone-600">The jobs businesses of every kind use MannaBooks for.</p>
            </div>
            <Link href="/use-cases" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">All use cases <ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {USE_CASES.map(({ slug, icon: Icon, title }) => (
              <Link key={slug} href={`/use-cases/${slug}`} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-stone-700 ring-1 ring-stone-200 hover:text-brand-700 hover:ring-brand-300">
                <Icon className="h-4 w-4 text-brand-700" aria-hidden />{title}
              </Link>
            ))}
          </div>

          <h2 className="mt-14 text-2xl font-bold tracking-tight text-stone-900">Any size of business</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {SIZES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border border-stone-200 bg-white p-5">
                <Icon className="h-5 w-5 text-brand-700" aria-hidden />
                <p className="mt-3 font-semibold text-stone-900">{title}</p>
                <p className="mt-1 text-sm text-stone-600">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-stone-600">Every business gets KRA PIN and VAT on its documents, withholding tax on supplier payments, statutory payroll (PAYE, SHIF, NSSF and Housing Levy), and KRA eTIMS signing once KRA approves MannaBooks.</p>
        </div>
      </section>

      <CtaBand title="Don't see your business here?" text="If you sell, buy, keep stock or pay staff in Kenya, MannaBooks fits. Try it with your own business." />
    </PublicPage>
  );
}
