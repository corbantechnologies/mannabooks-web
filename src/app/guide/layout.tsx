import Link from "next/link";

import { TopBar } from "@/components/top-bar";
import { PUBLIC_GUIDES, guideSections } from "@/content/guides";

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  const sections = guideSections(PUBLIC_GUIDES);
  return (
    <>
      <TopBar />
      <div className="mx-auto flex max-w-5xl gap-8 px-4 py-8">
        <aside className="hidden w-52 shrink-0 md:block">
          <Link href="/guide" className="mb-4 block text-sm font-semibold text-stone-900">
            User guides
          </Link>
          {sections.map((section) => (
            <div key={section} className="mb-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-400">{section}</p>
              {PUBLIC_GUIDES.filter((g) => g.section === section).map((g) => (
                <Link key={g.slug} href={`/guide/${g.slug}`} className="block rounded px-2 py-1 text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900">
                  {g.title}
                </Link>
              ))}
            </div>
          ))}
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}
