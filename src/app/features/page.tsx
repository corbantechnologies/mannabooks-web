import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CtaBand, Eyebrow, JsonLd, PublicPage } from "@/components/marketing";
import { FEATURE_GROUPS } from "@/content/features";
import { USE_CASES } from "@/content/use-cases";
import { plansWith } from "@/lib/plans";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Features: everything MannaBooks does" },
  description: "Quotations, invoices, catalogues, M-Pesa, the till, gift vouchers, stock, payroll for permanent and casual staff, budgets, approvals, departments and reports, built for Kenyan businesses.",
  alternates: { canonical: "/features" },
};

const COUNT = FEATURE_GROUPS.reduce((n, g) => n + g.items.length, 0);

function includedIn(module?: string): string {
  if (!module) return "Every plan";
  const names = plansWith(module).map((p) => p.name);
  return names.length ? names.join(", ") : "Kampuni";
}

export default function FeaturesPage() {
  return (
    <PublicPage>
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "ItemList", name: "MannaBooks features", url: `${SITE_URL}/features`,
        itemListElement: FEATURE_GROUPS.map((g, i) => ({ "@type": "ListItem", position: i + 1, name: g.title, url: `${SITE_URL}/features#${g.id}` })),
      }} />

      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:pt-20">
          <Eyebrow>Features</Eyebrow>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">Everything your business runs on, in one set of books.</h1>
          <p className="mt-5 max-w-2xl text-lg text-stone-600">
            {COUNT} features across selling, M-Pesa, stock, payroll and control. They share one set of books, so a sale, a bill or a payslip is entered once and the accounts are always up to date. Start with what you need and switch on the rest later.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-5 py-3 font-medium text-white hover:bg-brand-600">
              Try them all free for 30 days <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/pricing" className="inline-flex items-center rounded-md border border-stone-300 bg-white px-5 py-3 font-medium text-stone-800 hover:bg-stone-50">Compare plans</Link>
          </div>
        </div>
      </section>

      <nav aria-label="Feature groups" className="sticky top-16 z-30 border-y border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
          {FEATURE_GROUPS.map(({ id, icon: Icon, title }) => (
            <a key={id} href={`#${id}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-stone-600 hover:bg-brand-50 hover:text-brand-700">
              <Icon className="h-4 w-4" aria-hidden />{title}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4">
        {FEATURE_GROUPS.map(({ id, icon: Icon, title, summary, module, items }, i) => (
          <section key={id} id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-32 py-14 ${i > 0 ? "border-t border-stone-100" : ""}`}>
            <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
              <div className="lg:sticky lg:top-36 lg:self-start">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon className="h-5 w-5" aria-hidden /></span>
                <h2 id={`${id}-title`} className="mt-4 text-2xl font-bold tracking-tight text-stone-900">{title}</h2>
                <p className="mt-2 text-stone-600">{summary}</p>
                <p className="mt-4 text-xs text-stone-500"><span className="font-semibold uppercase tracking-wider">Included in</span> <span className="block mt-0.5 text-sm text-stone-700">{includedIn(module)}</span></p>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2">
                {items.map(({ name, text, guide, isNew, module: own }) => {
                  const body = (
                    <>
                      <span className="flex items-start justify-between gap-3">
                        <span className="font-semibold text-stone-900">{name}</span>
                        {isNew && <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100">New</span>}
                      </span>
                      <span className="mt-1.5 block flex-1 text-sm text-stone-600">{text}</span>
                      {own && own !== module && <span className="mt-2 block text-xs text-stone-500">In {includedIn(own)}</span>}
                      {guide && <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700">Read the guide <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden /></span>}
                    </>
                  );
                  return (
                    <li key={name}>
                      {guide ? (
                        <Link href={`/guide/${guide}`} className="group flex h-full flex-col rounded-xl border border-stone-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm">{body}</Link>
                      ) : <div className="flex h-full flex-col rounded-xl border border-stone-200 bg-white p-5">{body}</div>}
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        ))}
      </div>

      <section className="border-t border-stone-100 bg-stone-50">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-stone-900">See them at work</h2>
              <p className="mt-1 text-stone-600">How businesses put these together for a job, step by step.</p>
            </div>
            <Link href="/industries" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">MannaBooks by industry <ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {USE_CASES.map(({ slug, icon: Icon, title }) => (
              <Link key={slug} href={`/use-cases/${slug}`} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-stone-700 ring-1 ring-stone-200 hover:text-brand-700 hover:ring-brand-300">
                <Icon className="h-4 w-4 text-brand-700" aria-hidden />{title}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaBand title="Every feature, free for 30 days" text="Then choose a plan, or stay on Free for as long as you like." />
    </PublicPage>
  );
}
