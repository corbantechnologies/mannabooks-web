import { ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";

import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/** The frame of every public page: header, content, footer. */
export function PublicPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-stone-800">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

export function Breadcrumbs({ trail }: { trail: [string, string?][] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 text-sm text-stone-500">
      <ol className="flex flex-wrap items-center gap-1">
        {trail.map(([label, href], i) => (
          <li key={label} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
            {href ? <Link href={href} className="hover:text-stone-900">{label}</Link> : <span aria-current="page" className="text-stone-700">{label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">{children}</p>;
}

export function CtaBand({ title, text, cta = "Create your business", href = "/signup" }: { title: string; text: string; cta?: string; href?: string }) {
  return (
    <section className="bg-brand-700">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-12 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="mt-1 text-brand-100">{text}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={href} className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 font-medium text-brand-700 hover:bg-brand-50">
            {cta} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link href="/contact?topic=demo" className="inline-flex items-center rounded-md border border-white/40 px-5 py-3 font-medium text-white hover:bg-white/10">
            Book a demo
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Questions and answers as native disclosure widgets, so they work without JavaScript. */
export function Faqs({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
      {items.map(({ q, a }) => (
        <details key={q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-stone-900">
            {q}
            <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-open:rotate-90" aria-hidden />
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">{a}</p>
        </details>
      ))}
    </div>
  );
}

/** Structured data for search engines. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
}
