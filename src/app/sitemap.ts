import type { MetadataRoute } from "next";

import { PUBLIC_GUIDES } from "@/content/guides";
import { INDUSTRIES } from "@/content/industries";
import { USE_CASES } from "@/content/use-cases";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly", priority });
  return [
    page("", 1),
    page("/pricing", 0.9),
    page("/industries", 0.9),
    page("/use-cases", 0.9),
    ...INDUSTRIES.map((i) => page(`/industries/${i.slug}`, 0.8)),
    ...USE_CASES.map((u) => page(`/use-cases/${u.slug}`, 0.8)),
    page("/faq", 0.7),
    page("/moving", 0.6),
    page("/contact", 0.6),
    page("/guide", 0.7),
    ...PUBLIC_GUIDES.map((g) => page(`/guide/${g.slug}`, 0.5)),
    page("/privacy", 0.3),
    page("/terms", 0.3),
  ];
}
