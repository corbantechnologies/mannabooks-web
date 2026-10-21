import Link from "next/link";

import { Breadcrumbs, PublicPage } from "./marketing";

export type LegalSection = { heading: string; body: (string | string[])[] };

/** A policy page: numbered sections with a table of contents. A string is a paragraph; an array is a bulleted list. */
export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: string; sections: LegalSection[] }) {
  const id = (i: number) => `section-${i + 1}`;
  return (
    <PublicPage>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Breadcrumbs trail={[["Home", "/"], [title]]} />
        <div className="grid gap-12 lg:grid-cols-4">
          <aside className="hidden lg:block">
            <nav aria-label="Sections" className="sticky top-24 space-y-1 text-sm">
              {sections.map((s, i) => (
                <a key={s.heading} href={`#${id(i)}`} className="block rounded px-2 py-1 text-stone-600 hover:bg-stone-100 hover:text-stone-900">{i + 1}. {s.heading}</a>
              ))}
            </nav>
          </aside>
          <article className="max-w-3xl lg:col-span-3">
            <h1 className="text-4xl font-bold tracking-tight text-stone-900">{title}</h1>
            <p className="mt-2 text-sm text-stone-500">Last updated {updated}</p>
            <p className="mt-6 leading-relaxed text-stone-700">{intro}</p>
            {sections.map((s, i) => (
              <section key={s.heading} id={id(i)} className="mt-10 scroll-mt-24">
                <h2 className="text-xl font-semibold text-stone-900">{i + 1}. {s.heading}</h2>
                {s.body.map((part, j) => typeof part === "string" ? (
                  <p key={j} className="mt-3 leading-relaxed text-stone-700">{part}</p>
                ) : (
                  <ul key={j} className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-stone-700">
                    {part.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                ))}
              </section>
            ))}
            <p className="mt-12 rounded-lg bg-stone-50 px-4 py-3 text-sm text-stone-600">
              Questions about this page? <Link href="/contact" className="font-medium text-brand-700 hover:underline">Contact us</Link>.
            </p>
          </article>
        </div>
      </div>
    </PublicPage>
  );
}
