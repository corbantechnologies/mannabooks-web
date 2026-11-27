import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Breadcrumbs, CtaBand, JsonLd, PublicPage } from "@/components/marketing";
import { BLOG_TITLE, POSTS, findPost, postDate, postIso, postUrl } from "@/content/blog";
import { SITE_URL } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = findPost((await params).slug);
  if (!post) return { title: "Blog" };
  const url = `/blog/${post.slug}`;
  // a page's openGraph replaces the site's, so it says everything again (the share image comes from opengraph-image.tsx)
  return {
    title: post.title,
    description: post.description,
    keywords: post.tags ?? ["MannaBooks", "accounting software Kenya", "M-Pesa", "payroll Kenya", "what's new"],
    alternates: { canonical: url, types: { "application/rss+xml": "/blog/rss.xml" } },
    authors: [{ name: "MannaBooks", url: SITE_URL }],
    openGraph: {
      type: "article", url, title: post.title, description: post.description, siteName: "MannaBooks", locale: "en_KE",
      publishedTime: postIso(post.date), modifiedTime: postIso(post.updated ?? post.date), section: post.kind, authors: [SITE_URL],
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.description },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = findPost((await params).slug);
  if (!post) notFound();
  const i = POSTS.indexOf(post);
  const newer = POSTS[i - 1];
  const older = POSTS[i + 1];
  return (
    <PublicPage>
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.description, articleSection: post.kind,
        datePublished: postIso(post.date), dateModified: postIso(post.updated ?? post.date), inLanguage: "en-KE",
        url: postUrl(post.slug), mainEntityOfPage: { "@type": "WebPage", "@id": postUrl(post.slug) },
        image: `${postUrl(post.slug)}/opengraph-image`,
        author: { "@type": "Organization", name: "MannaBooks", url: SITE_URL },
        publisher: { "@type": "Organization", name: "MannaBooks", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/apple-icon.png` } },
        isPartOf: { "@type": "Blog", name: BLOG_TITLE, url: `${SITE_URL}/blog` },
      }} />
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
          { "@type": "ListItem", position: 3, name: post.title, item: postUrl(post.slug) },
        ],
      }} />
      <article className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:pt-14">
        <Breadcrumbs trail={[["Home", "/"], ["Blog", "/blog"], [post.title]]} />
        <p className="text-sm text-stone-500"><span className="font-medium text-brand-700">{post.kind}</span> · {post.week ? `${post.week} · ` : ""}<time dateTime={post.date}>{postDate(post.date)}</time></p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">{post.title}</h1>
        <p className="mt-4 text-lg text-stone-600">{post.summary}</p>
        <div className="prose-guide mt-8">
          <ReactMarkdown remarkPlugins={[remarkGfm]}
            components={{ a: ({ href = "", children }) => (href.startsWith("/") ? <Link href={href}>{children}</Link> : <a href={href}>{children}</a>) }}>
            {post.body}
          </ReactMarkdown>
        </div>
        {post.next && post.next.length > 0 && (
          <section className="mt-10 rounded-xl border border-brand-100 bg-brand-50 p-5">
            <h2 className="font-semibold text-stone-900">Coming next</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">{post.next.map((n) => <li key={n}>{n}</li>)}</ul>
          </section>
        )}
        <nav aria-label="More posts" className="mt-10 flex flex-wrap justify-between gap-4 border-t border-stone-200 pt-6 text-sm">
          {older ? <Link href={`/blog/${older.slug}`} className="text-brand-700 hover:underline">&larr; {older.title}</Link> : <span />}
          {newer ? <Link href={`/blog/${newer.slug}`} className="inline-flex items-center gap-1 text-brand-700 hover:underline">{newer.title} <ArrowRight className="h-4 w-4" aria-hidden /></Link> : <span />}
        </nav>
      </article>
      <CtaBand title="Try what's new" text="Every feature, free for 30 days." />
    </PublicPage>
  );
}
