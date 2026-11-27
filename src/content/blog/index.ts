/**
 * The blog (/blog). Posts live in posts.json; they're sorted newest first here.
 * Each Friday's "What's new" post: what shipped that week and what comes next.
 * - `summary`: the lead paragraph on the page and the list.
 * - `description`: at most 160 characters, for search results and link previews (WhatsApp, LinkedIn, X).
 * - `body`: Markdown, like the guides (links to /guide/... work).
 * Add a post by adding an object; the slug is its address and never changes once shared.
 */
import { SITE_URL } from "@/lib/site";

import posts from "./posts.json";

export type BlogPost = {
  slug: string;
  title: string;
  kind: string;
  date: string;
  updated?: string;
  week?: string;
  summary: string;
  description: string;
  body: string;
  next?: string[];
  tags?: string[];
};

export const POSTS: BlogPost[] = [...(posts as BlogPost[])].sort((a, b) => b.date.localeCompare(a.date));

export const findPost = (slug: string) => POSTS.find((p) => p.slug === slug);

export const postDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export const postUrl = (slug: string) => `${SITE_URL}/blog/${slug}`;

/** East Africa Time, so a post dated Saturday in Kenya isn't read as Friday elsewhere. */
export const postIso = (iso: string) => `${iso}T09:00:00+03:00`;

export const BLOG_TITLE = "What's new in MannaBooks";
export const BLOG_DESCRIPTION = "Every Friday, what we added to MannaBooks that week and what's coming next: accounting, M-Pesa, stock and payroll for Kenyan businesses.";
