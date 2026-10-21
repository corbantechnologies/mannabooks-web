import { ArrowRight, ArrowUpRight, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import Link from "next/link";

import { Logo } from "./logo";

export const COMPANY = { name: "Corban Technologies LTD", url: "https://www.corbantechnologies.org" };

const COLUMNS: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/industries", label: "Industries" },
      { href: "/signup", label: "Create an account" },
      { href: "/signin", label: "Sign in" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/guide", label: "User guides" },
      { href: "/guide/getting-started", label: "Getting started" },
      { href: "/guide/invoices", label: "Invoicing and M-Pesa" },
      { href: "/guide/payroll", label: "Kenyan payroll" },
      { href: "/guide/plan-and-billing", label: "Plans and billing" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/contact", label: "Contact us" },
      { href: "/contact?topic=demo", label: "Book a demo" },
      { href: "/contact?topic=partner", label: "Partners and accountants" },
      { href: COMPANY.url, label: "Corban Technologies", external: true },
    ],
  },
];

const BADGES = [
  { icon: Smartphone, label: "M-Pesa built in" },
  { icon: ShieldCheck, label: "KRA ready" },
  { icon: Wallet, label: "Kenyan payroll" },
];

/** The footer of the public pages. */
export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-stone-50 text-sm">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Link href="/" aria-label="MannaBooks home"><Logo /></Link>
          <p className="mt-4 max-w-sm leading-relaxed text-stone-600">
            Sales, M-Pesa, stock, payroll and reports in one set of books, built for how Kenyan businesses work.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {BADGES.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700 ring-1 ring-stone-200">
                <Icon className="h-3.5 w-3.5 text-brand-700" aria-hidden />{label}
              </li>
            ))}
          </ul>
          <Link href="/signup" className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2.5 font-medium text-white hover:bg-brand-600">
            Start free <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-900">{col.title}</p>
              <ul className="mt-4 space-y-3">
                {col.links.map(({ href, label, external }) => (
                  <li key={href}>
                    {external ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900">
                        {label}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    ) : (
                      <Link href={href} className="text-stone-600 hover:text-stone-900">{label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-stone-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {COMPANY.name}. All rights reserved.</p>
          <p>
            MannaBooks is a product of{" "}
            <a href={COMPANY.url} target="_blank" rel="noopener noreferrer" className="font-medium text-stone-700 hover:text-stone-900">{COMPANY.name}</a>
            {" "}· Made in Kenya
          </p>
        </div>
      </div>
    </footer>
  );
}
