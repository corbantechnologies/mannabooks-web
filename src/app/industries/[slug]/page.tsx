import { ArrowRight, BookOpen, Check, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs, CtaBand, Eyebrow, Faqs, JsonLd, PublicPage, faqJsonLd } from "@/components/marketing";
import { findGuide } from "@/content/guides";
import { INDUSTRIES, findIndustry } from "@/content/industries";
import { findUseCase } from "@/content/use-cases";
import { planOf, shillings } from "@/lib/plans";

export function generateStaticParams() {
  return INDUSTRIES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const industry = findIndustry((await params).slug);
  if (!industry) return {};
  return {
    title: { absolute: `${industry.headline} | MannaBooks` },
    description: industry.intro,
    alternates: { canonical: `/industries/${industry.slug}` },
    openGraph: { title: industry.headline, description: industry.tagline },
  };
}

export default async function IndustryPage({ params }: { params: Promise<{ slug: string }> }) {
  const industry = findIndustry((await params).slug);
  if (!industry) notFound();
  const { icon: Icon, name, headline, intro, who, uses, problems, day, example } = industry;
  const plan = planOf(industry.plan);
  const useCases = industry.useCases.map(findUseCase).filter((u) => u !== undefined);
  const guides = industry.guides.map((g) => findGuide(g)).filter((g) => g !== undefined);
  const others = INDUSTRIES.filter((i) => i.slug !== industry.slug);

  return (
    <PublicPage>
      <JsonLd data={faqJsonLd(industry.faqs)} />
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:pb-20">
          <Breadcrumbs trail={[["Home", "/"], ["Industries", "/industries"], [name]]} />
          <div className="grid items-start gap-10 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-brand-700 ring-1 ring-brand-100">
                <Icon className="h-4 w-4" aria-hidden />{name}
              </span>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">{headline}</h1>
              <p className="mt-5 text-lg leading-relaxed text-stone-600">{intro}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-5 py-3 font-medium text-white hover:bg-brand-600">
                  Start your free trial <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link href="/contact?topic=demo" className="inline-flex items-center rounded-md border border-stone-300 bg-white px-5 py-3 font-medium text-stone-800 hover:bg-stone-50">
                  Book a demo
                </Link>
              </div>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Made for</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {who.map((w) => <li key={w} className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700">{w}</li>)}
              </ul>
              <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-stone-500">What you&apos;ll use</p>
              <ul className="mt-3 space-y-2 text-sm text-stone-700">
                {uses.map((u) => <li key={u} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />{u}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <Eyebrow>The problems</Eyebrow>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">What gets in the way, and how MannaBooks fixes it</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {problems.map(({ title, text }) => (
            <div key={title} className="rounded-xl border border-stone-200 p-6">
              <h3 className="font-semibold text-stone-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-stone-50">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:grid-cols-2">
          <div>
            <Eyebrow>A day with MannaBooks</Eyebrow>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">How the work flows</h2>
            <ol className="relative mt-8 space-y-6 border-l-2 border-brand-100 pl-6">
              {day.map(({ title, text }, i) => (
                <li key={title} className="relative">
                  <span className="absolute -left-[2.15rem] flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-xs font-semibold text-white">{i + 1}</span>
                  <h3 className="font-semibold text-stone-900">{title}</h3>
                  <p className="mt-1 text-sm text-stone-600">{text}</p>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <Eyebrow>Worked example</Eyebrow>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">{example.business}</h2>
            <div className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
              <p className="border-b border-stone-100 px-5 py-4 text-sm leading-relaxed text-stone-700">{example.intro}</p>
              <ol className="space-y-3 px-5 py-4 text-sm text-stone-700">
                {example.steps.map((s, i) => (
                  <li key={s} className="flex gap-3"><span className="mt-0.5 font-mono text-xs font-semibold text-brand-700">{i + 1}.</span><span>{s}</span></li>
                ))}
              </ol>
              <table className="w-full border-t border-stone-100 text-sm">
                <tbody>
                  {example.figures.map(([label, value], i) => (
                    <tr key={label} className={i === example.figures.length - 1 ? "bg-brand-50 font-semibold text-stone-900" : "text-stone-700"}>
                      <td className="px-5 py-2">{label}</td>
                      <td className="whitespace-nowrap px-5 py-2 text-right font-mono">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {example.note && <p className="border-t border-stone-100 px-5 py-3 text-xs text-stone-500">{example.note}</p>}
            </div>
            <p className="mt-3 text-xs text-stone-400">An illustrative example with made-up figures, not a customer.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Eyebrow>Use cases</Eyebrow>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">The jobs MannaBooks does for you</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {useCases.map(({ slug, icon: UIcon, title, summary }) => (
                <Link key={slug} href={`/use-cases/${slug}`} className="group rounded-xl border border-stone-200 p-5 transition hover:border-brand-300 hover:shadow-sm">
                  <UIcon className="h-5 w-5 text-brand-700" aria-hidden />
                  <h3 className="mt-3 font-semibold text-stone-900 group-hover:text-brand-700">{title}</h3>
                  <p className="mt-1 text-sm text-stone-600">{summary}</p>
                </Link>
              ))}
            </div>
          </div>
          <aside className="space-y-5">
            <div className="rounded-xl border-2 border-brand-600 p-6">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-700"><Sparkles className="h-4 w-4" aria-hidden />Recommended plan</p>
              <p className="mt-3 text-2xl font-bold text-stone-900">{plan.name}</p>
              <p className="text-sm text-stone-600">{shillings(plan.price_monthly)} a month, or {shillings(plan.price_yearly)} a year</p>
              <p className="mt-3 text-sm text-stone-700">{industry.planNote}</p>
              <p className="mt-4 rounded-md bg-stone-50 px-3 py-2 text-sm text-stone-700">When you set up, choose <strong>{industry.goal}</strong>.</p>
              <Link href="/pricing" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">Compare plans <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </div>
            {guides.length > 0 && (
              <div className="rounded-xl border border-stone-200 p-6">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500"><BookOpen className="h-4 w-4" aria-hidden />Guides</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {guides.map((g) => <li key={g.slug}><Link href={`/guide/${g.slug}`} className="text-stone-700 hover:text-brand-700 hover:underline">{g.title}</Link></li>)}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="bg-stone-50">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight text-stone-900">Questions</h2>
          <div className="mt-8"><Faqs items={industry.faqs} /></div>
          <p className="mt-6 text-center text-sm text-stone-600">More questions? <Link href="/faq" className="font-medium text-brand-700 hover:underline">Read the FAQ</Link> or <Link href="/contact" className="font-medium text-brand-700 hover:underline">talk to us</Link>.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-lg font-semibold text-stone-900">Other industries</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {others.map(({ slug, icon: OIcon, name: other }) => (
            <Link key={slug} href={`/industries/${slug}`} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-stone-700 ring-1 ring-stone-200 hover:text-brand-700 hover:ring-brand-300">
              <OIcon className="h-4 w-4 text-brand-700" aria-hidden />{other}
            </Link>
          ))}
        </div>
      </section>

      <CtaBand title="Try MannaBooks with your business" text="30 days of every feature, free. No card needed." />
    </PublicPage>
  );
}
