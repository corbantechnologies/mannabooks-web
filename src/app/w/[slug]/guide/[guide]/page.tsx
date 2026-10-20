import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GuideArticle } from "@/components/guide-article";
import { GUIDES, findGuide, guideSections } from "@/content/guides";

export default async function WorkspaceGuide({ params }: { params: Promise<{ slug: string; guide: string }> }) {
  const { slug, guide: guideSlug } = await params;
  const guide = findGuide(guideSlug, true);
  if (!guide) notFound();
  const base = `/w/${slug}/guide`;
  return (
    <div className="flex gap-8">
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Link href={base} className="text-sm text-stone-500 hover:underline">&larr; All guides</Link>
          {guide.app && (
            <Link href={`/w/${slug}${guide.app}`} className="inline-flex items-center gap-1.5 rounded-md bg-brand-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600">
              Open {guide.title.toLowerCase()} <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        <GuideArticle slug={guide.slug} base={base} />
      </div>
      <aside className="hidden w-52 shrink-0 lg:block">
        {guideSections(GUIDES).map((section) => (
          <div key={section} className="mb-4">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-400">{section}</p>
            {GUIDES.filter((g) => g.section === section).map((g) => (
              <Link key={g.slug} href={`${base}/${g.slug}`}
                className={`block rounded px-2 py-1 text-sm ${g.slug === guide.slug ? "bg-brand-50 font-medium text-brand-700" : "text-stone-600 hover:bg-stone-100"}`}>
                {g.title}
              </Link>
            ))}
          </div>
        ))}
      </aside>
    </div>
  );
}
