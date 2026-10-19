import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GuideArticle } from "@/components/guide-article";
import { PUBLIC_GUIDES, findGuide } from "@/content/guides";

export const dynamicParams = false;

export function generateStaticParams() {
  return PUBLIC_GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = findGuide((await params).slug);
  return { title: guide ? `${guide.title} guide` : "Guide" };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!findGuide(slug)) notFound();
  return <GuideArticle slug={slug} base="/guide" />;
}
