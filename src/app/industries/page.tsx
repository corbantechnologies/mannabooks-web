import {
  ArrowRight, Briefcase, Building2, Factory, GraduationCap, HardHat, HeartHandshake, HeartPulse, Network, Scissors, ShoppingBasket, Sprout, Store,
  Truck, UtensilsCrossed, Warehouse,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: { absolute: "Industries: who MannaBooks is for" },
  description: "Shops, restaurants, distributors, manufacturers, contractors, clinics, schools, farms, transporters, consultants and NGOs across Kenya run their books, stock and payroll on MannaBooks.",
};

type Industry = { icon: typeof Store; name: string; who: string[]; uses: string[] };

const INDUSTRIES: Industry[] = [
  {
    icon: Store, name: "Retail shops",
    who: ["Supermarkets and minimarts", "Hardware stores", "Chemists and pharmacies", "Agrovets", "Electronics and phone shops", "Boutiques and cosmetics", "Bookshops and stationers"],
    uses: ["Till with shifts and cash counts", "M-Pesa prompts and automatic matching", "Stock at average cost, with low-stock warnings", "Sell in cartons or pieces", "Loyalty points", "Online shop"],
  },
  {
    icon: Warehouse, name: "Wholesale and distribution",
    who: ["Distributors and stockists", "FMCG wholesalers", "Building materials suppliers", "Importers", "Spare parts dealers"],
    uses: ["Price lists for wholesale and contract customers", "LPOs, goods received and supplier bills", "Several warehouses and transfers", "Delivery notes", "Customer statements and reminders", "Business inbox for customers on MannaBooks"],
  },
  {
    icon: UtensilsCrossed, name: "Food and hospitality",
    who: ["Restaurants and cafés", "Bars and lounges", "Fast food and takeaways", "Bakeries", "Hotels and guest houses", "Caterers"],
    uses: ["Recipes with cost and margin per dish or drink", "Meals and drinks made when sold, taking out ingredients", "Spirits kept in ml and sold by the shot", "Till and M-Pesa", "Online orders for pickup or delivery"],
  },
  {
    icon: Factory, name: "Manufacturing and processing",
    who: ["Food and beverage processors", "Animal feed millers", "Furniture makers", "Block and pavers makers", "Soap, detergent and cosmetics", "Printing and packaging", "Garment and textile makers"],
    uses: ["Recipes (bills of materials)", "Production orders that cost the finished goods", "Raw materials and finished stock", "Cost of sales that is right every month", "Stock takes"],
  },
  {
    icon: HardHat, name: "Construction and real estate",
    who: ["Building and civil contractors", "Electrical and plumbing contractors", "Interior fit-out", "Property managers", "Real estate agents"],
    uses: ["Projects with income, costs and profit per job", "Quotations into invoices", "Service orders to subcontractors", "Withholding tax on supplier payments", "Recurring invoices for rent and service charge"],
  },
  {
    icon: Briefcase, name: "Professional services",
    who: ["Accountants and auditors", "Law firms", "Consultants", "Architects and engineers", "Marketing and creative agencies", "IT and software firms"],
    uses: ["Quotations, invoices and payment links", "Recurring retainers", "CRM: leads, deals and follow-ups", "Withholding VAT and income tax", "Projects for client work", "Work reports from staff"],
  },
  {
    icon: HeartPulse, name: "Health",
    who: ["Clinics and medical centres", "Dental and eye clinics", "Laboratories", "Pharmacies", "Veterinary practices"],
    uses: ["Cash sales and invoices to insurers and companies", "Stock of drugs and supplies", "Staff payroll and leave", "Branches", "Approvals for purchases"],
  },
  {
    icon: GraduationCap, name: "Education",
    who: ["Private schools", "Colleges and training institutes", "Driving schools", "Daycare and kindergartens", "Tuition centres"],
    uses: ["Recurring invoices for fees", "M-Pesa payments matched to students' invoices", "Customer statements for parents", "Payroll for teaching and support staff", "Budgets per term or year"],
  },
  {
    icon: Sprout, name: "Agriculture",
    who: ["Farms and greenhouses", "Dairy farms", "Poultry and pig farms", "Agro-processors", "Produce aggregators and exporters"],
    uses: ["Cost centres per farm, crop or herd", "Inputs in stock, used and costed", "Casual and permanent staff payroll", "Fixed assets: tractors, pumps, greenhouses", "Sales to buyers on invoice"],
  },
  {
    icon: Truck, name: "Transport and logistics",
    who: ["Transporters and fleet owners", "Courier and delivery firms", "Clearing and forwarding agents", "Tour and travel companies", "Car hire"],
    uses: ["Cost centres per vehicle", "Fuel, repairs and expenses with their VAT", "Vehicle register and depreciation", "Invoices with withholding tax", "Recurring contract billing"],
  },
  {
    icon: Scissors, name: "Personal and repair services",
    who: ["Salons, barbers and spas", "Gyms", "Garages and mechanics", "Laundry and dry cleaners", "Photographers and event planners"],
    uses: ["Till or invoices for services", "Products and parts in stock", "M-Pesa till payments", "Commission and staff payroll", "Simple profit reports"],
  },
  {
    icon: HeartHandshake, name: "NGOs, churches and associations",
    who: ["NGOs and foundations", "Churches and ministries", "Community and welfare groups", "Professional associations"],
    uses: ["Cost centres per programme or donor", "Budgets and budget against actual", "Approval chains for spending", "Payroll and leave", "Fixed assets register"],
  },
  {
    icon: Network, name: "Groups of companies",
    who: ["Family businesses with several companies", "Holding companies", "Owners with a shop, a transport firm and a farm"],
    uses: ["One sign-in for every business", "Sales, loans and repayments between companies posted on both sides", "Consolidated profit and loss and balance sheet", "Business inbox between the companies"],
  },
];

const SIZES = [
  { icon: ShoppingBasket, title: "Just starting", text: "One person sending invoices and taking M-Pesa. Choose Send invoices and get paid and MannaBooks shows only that." },
  { icon: Store, title: "Growing", text: "A shop or office with a few staff, stock and suppliers. Switch on the till, stock and payroll when you need them." },
  { icon: Building2, title: "Established", text: "Several branches, departments and approval chains, budgets and fixed assets, and a group of companies reported together." },
];

export default function IndustriesPage() {
  return (
    <div className="min-h-screen bg-white text-stone-800">
      <SiteHeader />

      <main>
        <section className="bg-gradient-to-b from-brand-50 to-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">Built for the way Kenyan businesses work, whatever you do.</h1>
            <p className="mt-5 max-w-2xl text-lg text-stone-600">
              From a single shop to a group of companies, MannaBooks keeps your sales, M-Pesa, stock, payroll and books together. Switch on only the parts your business needs.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {INDUSTRIES.map((i) => (
                <a key={i.name} href={`#${slugOf(i.name)}`} className="rounded-full bg-white px-3 py-1 text-sm text-stone-700 ring-1 ring-stone-200 hover:ring-brand-300">{i.name}</a>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-5 md:grid-cols-2">
            {INDUSTRIES.map(({ icon: Icon, name, who, uses }) => (
              <article key={name} id={slugOf(name)} className="scroll-mt-6 rounded-xl border border-stone-200 p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon className="h-5 w-5" aria-hidden /></span>
                  <h2 className="text-lg font-semibold text-stone-900">{name}</h2>
                </div>
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-stone-500">Who</p>
                <p className="mt-1 text-sm text-stone-700">{who.join(" · ")}</p>
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-stone-500">What they use</p>
                <ul className="mt-1 space-y-1 text-sm text-stone-700">
                  {uses.map((u) => <li key={u} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden />{u}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-stone-100 bg-stone-50">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <h2 className="text-2xl font-semibold text-stone-900">Any size of business</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {SIZES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-xl border border-stone-200 bg-white p-5">
                  <Icon className="h-5 w-5 text-brand-700" aria-hidden />
                  <p className="mt-3 font-semibold text-stone-900">{title}</p>
                  <p className="mt-1 text-sm text-stone-600">{text}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-stone-600">Every business gets KRA PIN and VAT on its documents, withholding taxes, statutory payroll (PAYE, SHIF, NSSF and Housing Levy), and KRA eTIMS signing once KRA approves MannaBooks.</p>
          </div>
        </section>

        <section className="bg-brand-700">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-10 text-white">
            <div>
              <p className="text-xl font-semibold">Don&apos;t see your business here?</p>
              <p className="text-brand-100">If you sell, buy, keep stock or pay staff in Kenya, MannaBooks fits. Try it with your own business.</p>
            </div>
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 font-medium text-brand-700 hover:bg-brand-50">
              Create your business <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function slugOf(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
