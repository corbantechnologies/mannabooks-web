import { ArrowRight, BookOpen, CheckCircle2, FileSpreadsheet, LifeBuoy, Smartphone, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs, Eyebrow, Faqs, PublicPage } from "@/components/marketing";

export const metadata: Metadata = {
  title: "Moving to the new MannaBooks",
  description: "Already on MannaBooks? Here is what is new, what happens to the old version, and how to move your business across step by step.",
  alternates: { canonical: "/moving" },
};

const NEW = [
  "M-Pesa payment prompts and payments that match themselves to invoices",
  "A till with shifts, stock in several warehouses, recipes and production",
  "Kenyan payroll with PAYE, SHIF, NSSF and the Housing Levy",
  "Approvals, budgets, projects, CRM and an online shop",
  "Roles for every person in your team, and an audit log",
  "Works on phones as well as computers",
];

const STEPS = [
  { icon: Users, title: "Create your account and business", text: "Sign up with the same email if you like, add your KRA PIN, VAT status and financial year, and choose what you want to do first.", guide: "getting-started" },
  { icon: FileSpreadsheet, title: "Bring in your lists", text: "Save your customers, suppliers and products from the old MannaBooks or a spreadsheet as CSV files, and import them in Import and export. Every row is checked first.", guide: "import-and-export" },
  { icon: BookOpen, title: "Enter opening balances", text: "Pick the date you switch, and enter each account's balance on that day: bank, M-Pesa, stock, what customers owe you and what you owe suppliers.", guide: "opening-balances" },
  { icon: CheckCircle2, title: "Add invoices still unpaid", text: "Enter customers' unpaid invoices so payments can be matched to them, or include them in each customer's opening balance.", guide: "invoices" },
  { icon: Smartphone, title: "Connect M-Pesa and invite your team", text: "Connect your paybill or till, then invite your staff with the role each needs.", guide: "mpesa" },
];

const FAQS = [
  { q: "What happens to the old MannaBooks?", a: "It keeps working for a while at its own address, so you can look up past records while you move. We'll email you the address and the date it closes, with plenty of notice." },
  { q: "Will my old data move across automatically?", a: "Not yet. Your lists come across by CSV import, and your balances by opening balances on the date you switch. If your business has a lot of history, contact us and we'll help you plan the move." },
  { q: "When should I switch?", a: "The start of a month is easiest, so the new books begin with a clean period. Keep the old MannaBooks for anything before that date." },
  { q: "Will it cost more?", a: "Every new business gets 30 days of every feature free, and there is a Free plan. Talk to us about the plan that fits your business." },
];

export default function MovingPage() {
  return (
    <PublicPage>
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:pb-20">
          <Breadcrumbs trail={[["Home", "/"], ["Moving to the new MannaBooks"]]} />
          <Eyebrow>For current MannaBooks users</Eyebrow>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">Moving to the new MannaBooks</h1>
          <p className="mt-5 max-w-2xl text-lg text-stone-600">
            We have rebuilt MannaBooks from the ground up. Here is what is new, what happens to the old version, and how to move your business across in an afternoon.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-5 py-3 font-medium text-white hover:bg-brand-600">
              Create your new account <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/contact?topic=migration" className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-5 py-3 font-medium text-stone-800 hover:bg-stone-50">
              <LifeBuoy className="h-4 w-4" aria-hidden />Help me move
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-bold tracking-tight text-stone-900">What&apos;s new</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {NEW.map((n) => <li key={n} className="flex gap-3 rounded-lg border border-stone-200 p-4 text-sm text-stone-700"><CheckCircle2 className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />{n}</li>)}
        </ul>
      </section>

      <section className="bg-stone-50">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="text-3xl font-bold tracking-tight text-stone-900">Move in five steps</h2>
          <ol className="mt-8 space-y-4">
            {STEPS.map(({ icon: Icon, title, text, guide }, i) => (
              <li key={title} className="flex gap-5 rounded-xl border border-stone-200 bg-white p-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon className="h-5 w-5" aria-hidden /></span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Step {i + 1}</p>
                  <h3 className="mt-1 font-semibold text-stone-900">{title}</h3>
                  <p className="mt-1 text-sm text-stone-600">{text}</p>
                  <Link href={`/guide/${guide}`} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">Read the guide <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold tracking-tight text-stone-900">Questions about moving</h2>
        <div className="mt-8"><Faqs items={FAQS} /></div>
        <p className="mt-6 text-center text-sm text-stone-600">
          Stuck? <Link href="/contact?topic=migration" className="font-medium text-brand-700 hover:underline">Tell us about your business</Link> and we&apos;ll help you move.
        </p>
      </section>
    </PublicPage>
  );
}
