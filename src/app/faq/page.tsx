import type { Metadata } from "next";
import Link from "next/link";

import { CtaBand, Eyebrow, Faqs, JsonLd, PublicPage, faqJsonLd } from "@/components/marketing";

export const metadata: Metadata = {
  title: "Questions and answers",
  description: "Pricing, trials, M-Pesa, KRA, payroll, your data and moving to MannaBooks: answers to the questions Kenyan businesses ask most.",
  alternates: { canonical: "/faq" },
};

const GROUPS: { title: string; items: { q: string; a: string }[] }[] = [
  {
    title: "Getting started",
    items: [
      { q: "What is MannaBooks?", a: "Accounting software for Kenyan businesses: quotations, invoices and the till, M-Pesa, buying and stock, payroll, and the reports that come from them, all in one set of books." },
      { q: "Do I need to be an accountant?", a: "No. You record sales, purchases and payments in plain terms; MannaBooks posts them to the books for you. Your accountant can join with their own login." },
      { q: "Does it work on my phone?", a: "Yes. MannaBooks runs in the browser on phones, tablets and computers, and you can add it to your home screen. Staff open payslips and ask for leave on their phones." },
      { q: "Can I bring in my customers and products?", a: "Yes. Import customers, suppliers, products and opening balances from CSV files, which you can save from Excel. MannaBooks checks every row before anything is added." },
      { q: "Can I run more than one business?", a: "Yes. One login can belong to several businesses, and you switch between them in one click. Groups of companies can also be reported on together." },
    ],
  },
  {
    title: "Pricing and billing",
    items: [
      { q: "Is there a free plan?", a: "Yes. The Free plan covers invoices, cash sales and M-Pesa for one person, up to 30 documents a month, for as long as you like." },
      { q: "How does the free trial work?", a: "Every new business gets 30 days of every feature. When it ends the business moves to the Free plan unless you choose a paid plan. Nothing you entered is lost." },
      { q: "How do I pay?", a: "By M-Pesa, from Plan and billing in MannaBooks, monthly or yearly. Yearly plans cost the same as 10 months." },
      { q: "What happens if I miss a payment?", a: "You get reminders and a grace period. After that the business becomes read-only: you can still see and export everything, and it works again as soon as it is paid." },
      { q: "Do you offer discounts?", a: "Registered NGOs and churches get 25% off. Accountants get free seats in their clients' businesses." },
    ],
  },
  {
    title: "M-Pesa, KRA and payroll",
    items: [
      { q: "Whose M-Pesa account receives the money?", a: "Yours. Each business connects its own paybill or till through Safaricom Daraja, so payments go straight to you. MannaBooks never holds your money." },
      { q: "Does MannaBooks support eTIMS?", a: "eTIMS signing is built in and switches on once KRA approves MannaBooks. Until then, keep using your current eTIMS method." },
      { q: "Does it handle VAT and withholding tax?", a: "Yes. VAT is worked out on every sale and purchase, withholding tax is kept back when you pay suppliers, and the VAT summary gives the figures for your return." },
      { q: "Which payroll deductions are included?", a: "PAYE, SHIF, NSSF and the Affordable Housing Levy, with remittance schedules for each." },
    ],
  },
  {
    title: "Your data",
    items: [
      { q: "Who owns my data?", a: "You do. You can export your lists and records at any time, and we never sell your data or use your books for advertising." },
      { q: "Is my data secure?", a: "Traffic is encrypted, passwords are stored as one-way hashes, each person sees only what their role allows, and every change is recorded in the audit log." },
      { q: "What happens to my data if I stop paying?", a: "Nothing is deleted. The business becomes read-only and stays exportable, or you can move it to the Free plan." },
    ],
  },
];

export default function FaqPage() {
  const all = GROUPS.flatMap((g) => g.items);
  return (
    <PublicPage>
      <JsonLd data={faqJsonLd(all)} />
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-3xl px-4 pb-6 pt-14 text-center sm:pt-20">
          <Eyebrow>Questions and answers</Eyebrow>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">What people ask us</h1>
          <p className="mt-4 text-lg text-stone-600">Can&apos;t find your answer? <Link href="/contact" className="font-medium text-brand-700 hover:underline">Ask us directly</Link>.</p>
          <nav aria-label="Topics" className="mt-6 flex flex-wrap justify-center gap-2">
            {GROUPS.map((g, i) => (
              <a key={g.title} href={`#topic-${i}`} className="rounded-full bg-white px-3 py-1 text-sm text-stone-700 ring-1 ring-stone-200 hover:ring-brand-300">{g.title}</a>
            ))}
          </nav>
        </div>
      </section>
      <div className="mx-auto max-w-3xl space-y-12 px-4 py-12">
        {GROUPS.map((g, i) => (
          <section key={g.title} id={`topic-${i}`} className="scroll-mt-24">
            <h2 className="mb-4 text-xl font-semibold text-stone-900">{g.title}</h2>
            <Faqs items={g.items} />
          </section>
        ))}
      </div>
      <CtaBand title="Try it with your own business" text="30 days of every feature, free. No card needed." />
    </PublicPage>
  );
}
