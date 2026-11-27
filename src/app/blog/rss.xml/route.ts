import { BLOG_DESCRIPTION, BLOG_TITLE, POSTS, postUrl } from "@/content/blog";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rfc822 = (iso: string) => new Date(`${iso}T09:00:00+03:00`).toUTCString();

/** The blog as an RSS feed (/blog/rss.xml), for feed readers and anyone following the Friday posts. */
export function GET() {
  const items = POSTS.map((p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${postUrl(p.slug)}</link>
      <guid isPermaLink="true">${postUrl(p.slug)}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <category>${esc(p.kind)}</category>
      <description>${esc(p.summary)}</description>
    </item>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(BLOG_TITLE)}</title>
    <link>${SITE_URL}/blog</link>
    <description>${esc(BLOG_DESCRIPTION)}</description>
    <language>en-ke</language>
    <atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml" />
${POSTS[0] ? `    <lastBuildDate>${rfc822(POSTS[0].updated ?? POSTS[0].date)}</lastBuildDate>\n` : ""}${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
