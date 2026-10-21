import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CtaBand, Eyebrow, PublicPage } from "@/components/marketing";
import { INDUSTRIES } from "@/content/industries";
import { USE_CASES, industriesFor } from "@/content/use-cases";

export const metadata: Metadata = {
  title: { absolute: "Use cases: what Kenyan businesses do with MannaBooks" },
  description: "Get paid by M-Pesa, sell at the till, keep stock, cost recipes, run payroll, cost jobs, control spending and report on a group of companies.",
  alternates: { canonical: "/use-cases" },
};

export default function UseCasesPage() {
  return (
    <PublicPage>
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:pt-20">
          <Eyebrow>Use cases</Eyebrow>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">Start from the job you need done.</h1>
          <p className="mt-5 max-w-2xl text-lg text-stone-600">
            Each of these is one part of MannaBooks, and they all share the same books. Start with one and switch on the rest when you need them.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map(({ slug, icon: Icon, title, summary }) => {
            const industries = industriesFor(slug);
            return (
              <Link key={slug} href={`/use-cases/${slug}`}
                className="group flex flex-col rounded-xl border border-stone-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon className="h-5 w-5" aria-hidden /></span>
                <h2 className="mt-4 text-lg font-semibold text-stone-900">{title}</h2>
                <p className="mt-1.5 flex-1 text-sm text-stone-600">{summary}</p>
                {industries.length > 0 && <p className="mt-3 text-xs text-stone-500">Used by {industries.length} of {INDUSTRIES.length} industries</p>}
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                  How it works <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>
        <p className="mt-10 text-center text-sm text-stone-600">
          Looking for your kind of business? <Link href="/industries" className="font-medium text-brand-700 hover:underline">See MannaBooks by industry</Link>.
        </p>
      </section>

      <CtaBand title="Every feature, free for 30 days" text="Then choose a plan, or stay on Free for as long as you like." />
    </PublicPage>
  );
}
