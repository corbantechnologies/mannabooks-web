import { ArrowUpRight, Building2, CalendarCheck, LifeBuoy, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ContactForm } from "@/components/contact-form";
import { COMPANY, SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isContactTopic } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Talk to the MannaBooks team about plans, a demo, moving your business over, or partnering with us.",
};

const WAYS = [
  { icon: CalendarCheck, title: "See it with your own business", text: "Book a demo and we'll walk you through sales, M-Pesa, stock and payroll using your kind of business.", href: "/contact?topic=demo", cta: "Book a demo" },
  { icon: LifeBuoy, title: "Already using MannaBooks?", text: "Use Help and feedback inside MannaBooks. It reaches support with your business details, so we can help faster.", href: "/guide/help-and-feedback", cta: "How to get help" },
  { icon: Users, title: "Accountants and partners", text: "Run your clients' books from one sign-in, with free seats in their businesses. Let's talk about working together.", href: "/contact?topic=partner", cta: "Partner with us" },
];

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  return (
    <div className="min-h-screen bg-white text-stone-800">
      <SiteHeader />
      <main>
        <section className="bg-gradient-to-b from-brand-50 to-white">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:py-20 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Contact us</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">Let&apos;s talk about your business.</h1>
              <p className="mt-5 text-lg text-stone-600">
                Questions about plans, moving your books over, or whether MannaBooks fits how you work? Send us a message and a real person will reply.
              </p>
              <div className="mt-8 rounded-xl border border-stone-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden />
                  <div className="text-sm">
                    <p className="font-semibold text-stone-900">{COMPANY.name}</p>
                    <p className="mt-1 text-stone-600">The company behind MannaBooks.</p>
                    <a href={COMPANY.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">
                      corbantechnologies.org<ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-3">
              <ContactForm key={topic ?? ""} topic={isContactTopic(topic) ? topic : "sales"} />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="grid gap-5 md:grid-cols-3">
            {WAYS.map(({ icon: Icon, title, text, href, cta }) => (
              <div key={title} className="flex flex-col rounded-xl border border-stone-200 p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50"><Icon className="h-5 w-5 text-brand-700" aria-hidden /></span>
                <h2 className="mt-4 font-semibold text-stone-900">{title}</h2>
                <p className="mt-1.5 flex-1 text-sm text-stone-600">{text}</p>
                <Link href={href} className="mt-4 text-sm font-medium text-brand-700 hover:underline">{cta} →</Link>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
