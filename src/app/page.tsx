import {
  ArrowRight, BarChart3, Boxes, Building2, CheckCheck, Landmark, ReceiptText, ShieldCheck, Smartphone, Users, Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { authOptions } from "@/lib/auth/options";

export const metadata: Metadata = {
  title: { absolute: "MannaBooks: accounting, stock and payroll for Kenyan businesses" },
  description: "Invoices, M-Pesa, stock, payroll with PAYE, SHIF, NSSF and Housing Levy, approvals and financial reports in one place, built for Kenyan businesses.",
};

const FEATURES = [
  { icon: ReceiptText, title: "Sell and get paid", text: "Quotations, invoices, cash sales and a till with shifts. Customers get a private link to see and pay their invoices." },
  { icon: Smartphone, title: "M-Pesa built in", text: "Connect your own paybill or till. Send payment prompts and let payments match themselves to invoices." },
  { icon: Boxes, title: "Buy and keep stock", text: "LPOs, goods received, supplier bills and payment vouchers. Stock in every warehouse at average cost, with stock takes." },
  { icon: Landmark, title: "Cash and banking", text: "Bank, M-Pesa and cash accounts. Import statements, match them and reconcile month by month." },
  { icon: Wallet, title: "Kenyan payroll", text: "PAYE, SHIF, NSSF and the Housing Levy worked out for you. Payslips staff open on their phones, and leave with balances." },
  { icon: CheckCheck, title: "Approvals and budgets", text: "Orders, vouchers and payroll go up the chain before they count. Budgets, cost centres and project costing keep spending in check." },
  { icon: BarChart3, title: "Reports that add up", text: "Profit and loss, balance sheet, who owes you, what you owe, and the VAT summary for your return. Print or export to Excel." },
  { icon: Building2, title: "Fixed assets", text: "A register of vehicles, computers and equipment, with monthly depreciation and the gain or loss when you sell." },
];

const KENYA = [
  "KRA PIN and VAT on every document, with withholding VAT and income tax",
  "KRA eTIMS signing, switching on once KRA approves MannaBooks",
  "M-Pesa through each business's own Daraja account",
  "Statutory payroll: PAYE, SHIF, NSSF and Housing Levy, with the remittance schedules",
];

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/workspaces");
  return (
    <div className="min-h-screen bg-white text-stone-800">
      <SiteHeader />

      <main>
        <section className="bg-gradient-to-b from-brand-50 to-white">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-24 lg:grid-cols-2">
            <div>
              <p className="mb-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100">Now open for pilot businesses</p>
              <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">Your whole business in one set of books.</h1>
              <p className="mt-5 max-w-xl text-lg text-stone-600">
                Sales, M-Pesa, stock, payroll and reports, built for how Kenyan businesses work. Every sale, bill and payslip posts to the books for you, so your accounts are always up to date.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-5 py-3 font-medium text-white hover:bg-brand-600">
                  Create your business <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/guide/getting-started" className="inline-flex items-center rounded-md border border-stone-300 bg-white px-5 py-3 font-medium text-stone-800 hover:bg-stone-50">
                  See how it works
                </Link>
              </div>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm" aria-hidden>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-stone-900">This month</p>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">Up to date</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[["Sales", "1,284,500"], ["Costs", "812,300"], ["Profit", "472,200"]].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-stone-50 p-3">
                    <p className="text-xs text-stone-500">{label}</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-stone-900">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {[["INV-2026-0142", "Baraka Supplies", "Paid by M-Pesa", "text-brand-700"], ["PO-2026-0031", "Bamburi Cement", "Waiting for approval", "text-amber-700"],
                  ["Payroll October", "12 payslips", "Approved", "text-brand-700"]].map(([doc, who, status, tone]) => (
                  <div key={doc} className="flex items-center justify-between rounded-md border border-stone-100 px-3 py-2">
                    <span><span className="font-mono text-xs text-stone-500">{doc}</span> <span className="ml-1 text-stone-700">{who}</span></span>
                    <span className={`text-xs font-medium ${tone}`}>{status}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-stone-400">Example figures in KES</p>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
          <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">Everything a growing business runs on</h2>
          <p className="mt-2 max-w-2xl text-stone-600">Start with invoicing and add stock, payroll or approvals when you need them. It is all one system, so nothing is typed twice.</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-lg border border-stone-200 p-5">
                <Icon className="h-6 w-6 text-brand-700" aria-hidden />
                <h3 className="mt-3 font-semibold text-stone-900">{title}</h3>
                <p className="mt-1.5 text-sm text-stone-600">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-stone-50">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">Made for Kenya</h2>
              <p className="mt-2 text-stone-600">Built around KRA, Safaricom and the statutory deductions you deal with every month, not adapted from somewhere else.</p>
              <ul className="mt-6 space-y-3">
                {KENYA.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-stone-700"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden />{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">Your team, your businesses</h2>
              <p className="mt-2 text-stone-600">Give each person the access their job needs, and run more than one business from one login.</p>
              <ul className="mt-6 space-y-3">
                {["Roles for owners, accountants, sales, cashiers, store managers and HR", "Staff see their own payslips and ask for leave on their phones",
                  "Every change is recorded in an audit log", "Accountants switch between their clients' businesses in one click"].map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-stone-700"><Users className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden />{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">Up and running in an afternoon</h2>
          <ol className="mt-8 grid gap-5 sm:grid-cols-3">
            {[["Create your account", "Sign up with your email. No card needed during the pilot."],
              ["Set up your business", "Add your KRA PIN, VAT status and financial year. The chart of accounts is ready for you."],
              ["Invite your team", "Choose each person's role. Start invoicing the same day."]].map(([title, text], i) => (
              <li key={title} className="rounded-lg border border-stone-200 p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white">{i + 1}</span>
                <h3 className="mt-3 font-semibold text-stone-900">{title}</h3>
                <p className="mt-1.5 text-sm text-stone-600">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-brand-700">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-12 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">Try MannaBooks with your business</h2>
              <p className="mt-1 text-brand-100">Join the pilot and tell us what works for you.</p>
            </div>
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 font-medium text-brand-700 hover:bg-brand-50">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
