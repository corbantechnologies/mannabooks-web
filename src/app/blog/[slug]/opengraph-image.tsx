import { ImageResponse } from "next/og";

import { POSTS, findPost, postDate } from "@/content/blog";

export const alt = "MannaBooks blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

/** Each post's picture when it is shared on WhatsApp, LinkedIn or X: its title, its week and the MannaBooks mark. */
export default async function PostImage({ params }: { params: Promise<{ slug: string }> }) {
  const post = findPost((await params).slug);
  const title = post?.title ?? "What's new in MannaBooks";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72,
        background: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 60%)", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <svg width="60" height="60" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="7" fill="#065f46" />
              <path d="M8 21.5V8.5h3.2L16 15.4l4.8-6.9H24v13h-3.2v-7.8L16 20l-4.8-6.3v7.8z" fill="#fff" />
              <rect x="8" y="23.6" width="16" height="1.8" rx="0.9" fill="#6ee7b7" />
            </svg>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#1c1917" }}>Manna<span style={{ color: "#065f46" }}>Books</span></div>
          </div>
          <div style={{ display: "flex", padding: "10px 22px", borderRadius: 999, background: "#065f46", color: "#fff", fontSize: 26 }}>{post?.kind ?? "Blog"}</div>
        </div>
        <div style={{ display: "flex", fontSize: title.length > 60 ? 58 : 68, fontWeight: 700, color: "#1c1917", lineHeight: 1.12, maxWidth: 1040 }}>{title}</div>
        <div style={{ display: "flex", fontSize: 30, color: "#57534e" }}>{post ? `${post.week ?? postDate(post.date)} · mannabooks.co.ke/blog` : "mannabooks.co.ke/blog"}</div>
      </div>
    ),
    size,
  );
}
