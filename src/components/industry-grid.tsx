"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { INDUSTRIES } from "@/content/industries";

/** The industry cards on /industries, with a box to find your kind of business. */
export function IndustryGrid() {
  const [query, setQuery] = useState("");
  const q = singular(query.trim());
  const shown = q ? INDUSTRIES.filter((i) => [i.name, i.tagline, ...i.who, ...i.uses].some((t) => singular(t).includes(q))) : INDUSTRIES;
  return (
    <>
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Find your kind of business"
          placeholder="Find your business: pharmacy, school, garage…"
          className="block w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-9 pr-3 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
      </div>
      {shown.length === 0 ? (
        <p className="mt-8 text-stone-600">
          Nothing matches &ldquo;{query}&rdquo;. If you sell, buy, keep stock or pay staff, MannaBooks fits;{" "}
          <Link href="/contact?topic=sales" className="font-medium text-brand-700 hover:underline">tell us about your business</Link>.
        </p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(({ slug, icon: Icon, name, tagline, who }) => (
            <Link key={slug} href={`/industries/${slug}`}
              className="group flex flex-col rounded-xl border border-stone-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon className="h-5 w-5" aria-hidden /></span>
              <h2 className="mt-4 text-lg font-semibold text-stone-900">{name}</h2>
              <p className="mt-1.5 text-sm text-stone-600">{tagline}</p>
              <p className="mt-3 flex-1 text-xs text-stone-500">{who.slice(0, 4).join(" · ")}{who.length > 4 ? " and more" : ""}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                See how it works <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

/** Lower case with plurals dropped, so "pharmacy" finds "pharmacies" and "schools" finds "school". */
function singular(text: string) {
  return text.toLowerCase().replace(/ies\b/g, "y").replace(/(?<!s)s\b/g, "");
}
