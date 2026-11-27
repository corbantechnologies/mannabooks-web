import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CtaBand, Eyebrow, JsonLd, PublicPage } from "@/components/marketing";
import { BLOG_DESCRIPTION, BLOG_TITLE, POSTS, postDate, postIso, postUrl } from "@/content/blog";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Blog: what's new in MannaBooks" },
  description: BLOG_DESCRIPTION,
  alternates: { canonical: "/blog", types: { "application/rss+xml": "/blog/rss.xml" } },
  openGraph: { type: "website", url: "/blog", title: BLOG_TITLE, description: BLOG_DESCRIPTION, siteName: "MannaBooks", locale: "en_KE" },
  twitter: { card: "summary_large_image", title: BLOG_TITLE, description: BLOG_DESCRIPTION },
};

export default function BlogPage() {
  const [latest, ...older] = POSTS;
  return (
    <PublicPage>
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "Blog", name: BLOG_TITLE, description: BLOG_DESCRIPTION, url: `${SITE_URL}/blog`, inLanguage: "en-KE",
        publisher: { "@type": "Organization", name: "MannaBooks", url: SITE_URL },
        blogPost: POSTS.map((p) => ({ "@type": "BlogPosting", headline: p.title, description: p.description, url: postUrl(p.slug), datePublished: postIso(p.date) })),
      }} />
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:pt-20">
          <Eyebrow>Blog</Eyebrow>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">What&apos;s new in MannaBooks</h1>
          <p className="mt-5 max-w-2xl text-lg text-stone-600">Every Friday: what we added that week, and what&apos;s coming next.</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-16">
        {latest && (
          <Link href={`/blog/${latest.slug}`} className="group block rounded-2xl border border-stone-200 bg-white p-6 transition hover:border-brand-300 hover:shadow-sm sm:p-8">
            <p className="text-sm text-stone-500"><span className="font-medium text-brand-700">{latest.kind}</span> · <time dateTime={latest.date}>{latest.week ?? postDate(latest.date)}</time></p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{latest.title}</h2>
            <p className="mt-3 max-w-3xl text-stone-600">{latest.summary}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700">Read it <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden /></span>
          </Link>
        )}
        {older.length > 0 && (
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {older.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="group flex h-full flex-col rounded-xl border border-stone-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm">
                  <span className="text-sm text-stone-500"><span className="font-medium text-brand-700">{p.kind}</span> · {p.week ?? postDate(p.date)}</span>
                  <span className="mt-1.5 font-semibold text-stone-900">{p.title}</span>
                  <span className="mt-1.5 flex-1 text-sm text-stone-600">{p.summary}</span>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700">Read it <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CtaBand title="See it for yourself" text="Every feature, free for 30 days." />
    </PublicPage>
  );
}
