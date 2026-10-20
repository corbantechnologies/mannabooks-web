import { readFile } from "node:fs/promises";
import path from "node:path";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** A guide's markdown. `base` is where guides live (/guide or /w/<workspace>/guide); /guide links are rewritten to it. */
export async function GuideArticle({ slug, base, children }: { slug: string; base: string; children?: React.ReactNode }) {
  const markdown = await readFile(path.join(process.cwd(), "src", "content", "guides", `${slug}.md`), "utf8");
  return (
    <article className="prose-guide max-w-4xl rounded-lg border border-stone-200 bg-white p-6 sm:p-8">
      {children}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href = "", children: text }) =>
            href.startsWith("/guide") ? <Link href={base + href.slice("/guide".length)}>{text}</Link> : <a href={href}>{text}</a>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}

export function GuideCards({ guides, base }: { guides: { slug: string; title: string; summary: string; section: string }[]; base: string }) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {guides.map((g) => (
        <Link key={g.slug} href={`${base}/${g.slug}`} className="rounded-lg border border-stone-200 bg-white p-4 hover:border-brand-600">
          <p className="text-xs uppercase tracking-wide text-stone-400">{g.section}</p>
          <p className="mt-1 font-medium text-stone-900">{g.title}</p>
          <p className="mt-1 text-sm text-stone-600">{g.summary}</p>
        </Link>
      ))}
    </div>
  );
}
