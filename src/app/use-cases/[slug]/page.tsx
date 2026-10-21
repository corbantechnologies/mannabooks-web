import { ArrowRight, BookOpen, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs, CtaBand, Eyebrow, PublicPage } from "@/components/marketing";
import { findGuide } from "@/content/guides";
import { USE_CASES, findUseCase, industriesFor } from "@/content/use-cases";
import { plansWith, shillings } from "@/lib/plans";

export function generateStaticParams() {
  return USE_CASES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const useCase = findUseCase((await params).slug);
  if (!useCase) return {};
  return {
    title: { absolute: `${useCase.title} with MannaBooks` },
    description: useCase.summary,
    alternates: { canonical: `/use-cases/${useCase.slug}` },
    openGraph: { title: `${useCase.title} with MannaBooks`, description: useCase.summary },
  };
}

export default async function UseCasePage({ params }: { params: Promise<{ slug: string }> }) {
  const useCase = findUseCase((await params).slug);
  if (!useCase) notFound();
  const { icon: Icon, title, summary, problem, steps, outcomes } = useCase;
  const industries = industriesFor(useCase.slug);
  const plans = plansWith(useCase.module);
  const guide = findGuide(useCase.guide);
  const others = USE_CASES.filter((u) => u.slug !== useCase.slug);

  return (
    <PublicPage>
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:pb-20">
          <Breadcrumbs trail={[["Home", "/"], ["Use cases", "/use-cases"], [title]]} />
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-700 text-white"><Icon className="h-6 w-6" aria-hidden /></span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-lg text-stone-600">{summary}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-5 py-3 font-medium text-white hover:bg-brand-600">
              Try it free <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            {guide && (
              <Link href={`/guide/${guide.slug}`} className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-5 py-3 font-medium text-stone-800 hover:bg-stone-50">
                <BookOpen className="h-4 w-4" aria-hidden />Read the guide
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border-l-4 border-amber-400 bg-amber-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">The problem</p>
            <p className="mt-1 text-stone-800">{problem}</p>
          </div>
          <div className="mt-12"><Eyebrow>How it works</Eyebrow></div>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2">
            {steps.map(({ title: step, text }, i) => (
              <li key={step} className="rounded-xl border border-stone-200 p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">{i + 1}</span>
                <h2 className="mt-3 font-semibold text-stone-900">{step}</h2>
                <p className="mt-1 text-sm text-stone-600">{text}</p>
              </li>
            ))}
          </ol>
        </div>
        <aside className="space-y-5">
          <div className="rounded-xl bg-stone-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">What you get</p>
            <ul className="mt-3 space-y-2.5 text-sm text-stone-700">
              {outcomes.map((o) => <li key={o} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />{o}</li>)}
            </ul>
          </div>
          {plans.length > 0 && (
            <div className="rounded-xl border border-stone-200 p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Included in</p>
              <ul className="mt-3 space-y-2 text-sm">
                {plans.map((p) => (
                  <li key={p.key} className="flex justify-between gap-3">
                    <span className="font-medium text-stone-900">{p.name}</span>
                    <span className="text-stone-500">{p.is_free ? "Free" : `${shillings(p.price_monthly)}/month`}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-stone-500">Every plan starts with a 30-day trial of everything.</p>
              <Link href="/pricing" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">See pricing <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </div>
          )}
        </aside>
      </section>

      {industries.length > 0 && (
        <section className="bg-stone-50">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="text-2xl font-bold tracking-tight text-stone-900">Who uses it</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {industries.map(({ slug, icon: IIcon, name, tagline }) => (
                <Link key={slug} href={`/industries/${slug}`} className="group flex gap-4 rounded-xl border border-stone-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm">
                  <IIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden />
                  <span>
                    <span className="block font-semibold text-stone-900 group-hover:text-brand-700">{name}</span>
                    <span className="mt-1 block text-sm text-stone-600">{tagline}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-lg font-semibold text-stone-900">More use cases</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {others.map(({ slug, icon: OIcon, title: other }) => (
            <Link key={slug} href={`/use-cases/${slug}`} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-stone-700 ring-1 ring-stone-200 hover:text-brand-700 hover:ring-brand-300">
              <OIcon className="h-4 w-4 text-brand-700" aria-hidden />{other}
            </Link>
          ))}
        </div>
      </section>

      <CtaBand title="Try it with your own business" text="30 days of every feature, free. No card needed." />
    </PublicPage>
  );
}
