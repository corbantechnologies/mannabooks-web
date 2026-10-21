"use client";

import clsx from "clsx";
import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Logo } from "./logo";

export const SITE_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/industries", label: "Industries" },
  { href: "/use-cases", label: "Use cases" },
  { href: "/pricing", label: "Pricing" },
  { href: "/guide", label: "Guides" },
  { href: "/contact", label: "Contact" },
];

/** The header of the public pages: links in a row on wide screens, behind a menu button on phones. */
export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [openedOn, setOpenedOn] = useState(path);
  if (open && openedOn !== path) { setOpen(false); setOpenedOn(path); }  // following a link closes the menu

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const current = (href: string) => !href.includes("#") && (path === href || path.startsWith(`${href}/`));
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="MannaBooks home" className="shrink-0"><Logo /></Link>
        <nav aria-label="Main" className="hidden items-center gap-0.5 text-sm lg:flex">
          {SITE_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={current(href) ? "page" : undefined}
              className={clsx("rounded-md px-3 py-2 transition-colors", current(href) ? "font-medium text-stone-900" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900")}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/signin" className="hidden rounded-md px-3 py-2 text-sm text-stone-700 hover:text-stone-900 sm:inline-flex">Sign in</Link>
          <Link href="/signup" className="inline-flex items-center gap-1.5 rounded-md bg-brand-700 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-600">
            Get started<ArrowRight className="hidden h-4 w-4 sm:block" aria-hidden />
          </Link>
          <button type="button" onClick={() => { setOpen((o) => !o); setOpenedOn(path); }} aria-expanded={open} aria-controls="site-menu"
            aria-label={open ? "Close menu" : "Open menu"} className="-mr-1 inline-flex h-10 w-10 items-center justify-center rounded-md text-stone-700 hover:bg-stone-100 lg:hidden">
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <div id="site-menu" className="border-t border-stone-200 bg-white shadow-lg lg:hidden">
          <nav aria-label="Main" className="mx-auto max-w-6xl px-4 py-3">
            {SITE_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={current(href) ? "page" : undefined}
                className={clsx("flex items-center justify-between rounded-md px-3 py-3 text-base", current(href) ? "bg-brand-50 font-medium text-brand-700" : "text-stone-700 hover:bg-stone-50")}>
                {label}
              </Link>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-stone-100 pt-4">
              <Link href="/signin" onClick={() => setOpen(false)} className="rounded-md border border-stone-300 px-4 py-2.5 text-center text-sm font-medium text-stone-800">Sign in</Link>
              <Link href="/signup" onClick={() => setOpen(false)} className="rounded-md bg-brand-700 px-4 py-2.5 text-center text-sm font-medium text-white">Create an account</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
