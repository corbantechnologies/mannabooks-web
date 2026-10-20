"use client";

import clsx from "clsx";
import {
  Building2,
  FileBarChart,
  ChartPie,
  CheckCheck,
  FolderKanban,
  ListChecks,
  Tags,
  Target,
  BadgeCheck,
  CalendarDays,
  Wallet as WalletIcon,
  UserRound,
  Landmark,
  ArrowDownToLine,
  ArrowUpFromLine,
  Repeat,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Factory,
  FileInput,
  Layers,
  PackageCheck,
  ArrowLeftRight,
  SlidersHorizontal,
  Truck as TruckIcon,
  Warehouse as WarehouseIcon,
  Wrench,
  Receipt,
  Wallet,
  CalendarClock,
  CreditCard,
  FilePlus,
  Gift,
  MailWarning,
  MonitorSmartphone,
  Smartphone,
  Tag,
  Timer,
  Truck,
  Banknote,
  BookOpen,
  BookOpenCheck,
  FileMinus,
  FileText,
  Package,
  ReceiptText,
  ScrollText,
  Store,
  Building,
  CalendarRange,
  ChevronsUpDown,
  Coins,
  History,
  LayoutDashboard,
  ListTree,
  Menu,
  Network,
  NotebookPen,
  Percent,
  Scale,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { PeriodFixDialog } from "@/components/period-fix-dialog";
import { PeriodSwitcher } from "@/components/period-switcher";
import { TopBar } from "@/components/top-bar";
import { ErrorState, Spinner } from "@/components/ui";
import { PeriodProvider } from "@/lib/period";
import { WorkspaceProvider, grants, useWorkspaceContextQuery, useWorkspaceSlug } from "@/lib/workspace";

type NavItem = { href: string; label: string; icon: typeof Users; perm: string[] | null };

const NAV: { section: string | null; items: NavItem[] }[] = [
  { section: null, items: [{ href: "", label: "Overview", icon: LayoutDashboard, perm: null }, { href: "/approvals", label: "Approvals", icon: CheckCheck, perm: null }] },
  {
    section: "Sales",
    items: [
      { href: "/sales/customers", label: "Customers", icon: Store, perm: ["customers.view"] },
      { href: "/sales/products", label: "Products", icon: Package, perm: ["products.view"] },
      { href: "/sales/quotations", label: "Quotations", icon: ScrollText, perm: ["quotations.view"] },
      { href: "/sales/invoices", label: "Invoices", icon: FileText, perm: ["invoices.view"] },
      { href: "/sales/payments", label: "Payments", icon: Banknote, perm: ["payments.view"] },
      { href: "/sales/cash-sales", label: "Cash sales", icon: ReceiptText, perm: ["receipts.view"] },
      { href: "/sales/credit-notes", label: "Credit notes", icon: FileMinus, perm: ["creditnotes.view"] },
      { href: "/sales/debit-notes", label: "Debit notes", icon: FilePlus, perm: ["invoices.view"] },
      { href: "/sales/delivery-notes", label: "Delivery notes", icon: Truck, perm: ["deliverynotes.view"] },
      { href: "/sales/recurring-invoices", label: "Recurring invoices", icon: CalendarClock, perm: ["recurringinvoices.view"] },
      { href: "/sales/mpesa", label: "M-Pesa payments", icon: Smartphone, perm: ["payments.view"] },
      { href: "/sales/reminders", label: "Payment reminders", icon: MailWarning, perm: ["reminders.view"] },
      { href: "/sales/price-lists", label: "Price lists", icon: Tag, perm: ["products.view"] },
      { href: "/sales/loyalty", label: "Loyalty", icon: Gift, perm: ["loyalty.view"] },
    ],
  },
  {
    section: "Point of sale",
    items: [
      { href: "/pos", label: "Till", icon: MonitorSmartphone, perm: ["pos.sell"] },
      { href: "/pos/shifts", label: "Shifts", icon: Timer, perm: ["pos.view"] },
      { href: "/pos/registers", label: "Tills", icon: CreditCard, perm: ["pos.manage"] },
    ],
  },
  {
    section: "Purchasing",
    items: [
      { href: "/purchasing/suppliers", label: "Suppliers", icon: TruckIcon, perm: ["suppliers.view"] },
      { href: "/purchasing/orders", label: "Purchase orders", icon: ClipboardList, perm: ["purchaseorders.view"] },
      { href: "/purchasing/service-orders", label: "Service orders", icon: Wrench, perm: ["purchaseorders.view"] },
      { href: "/purchasing/receipts", label: "Goods received", icon: PackageCheck, perm: ["goodsreceipts.view"] },
      { href: "/purchasing/bills", label: "Bills", icon: Receipt, perm: ["bills.view"] },
      { href: "/purchasing/vouchers", label: "Payment vouchers", icon: FileInput, perm: ["paymentvouchers.view"] },
      { href: "/purchasing/payments", label: "Supplier payments", icon: Wallet, perm: ["supplierpayments.view"] },
    ],
  },
  {
    section: "Inventory",
    items: [
      { href: "/inventory", label: "Stock", icon: Boxes, perm: ["inventory.view"] },
      { href: "/inventory/transfers", label: "Transfers", icon: ArrowLeftRight, perm: ["inventory.view"] },
      { href: "/inventory/adjustments", label: "Adjustments", icon: SlidersHorizontal, perm: ["inventory.view"] },
      { href: "/inventory/stock-takes", label: "Stock takes", icon: ClipboardCheck, perm: ["inventory.view"] },
      { href: "/inventory/warehouses", label: "Warehouses", icon: WarehouseIcon, perm: ["inventory.view"] },
      { href: "/manufacturing/recipes", label: "Recipes", icon: Layers, perm: ["manufacturing.view"] },
      { href: "/manufacturing/production", label: "Production", icon: Factory, perm: ["manufacturing.view"] },
    ],
  },
  {
    section: "Cash and banking",
    items: [
      { href: "/banking", label: "Accounts", icon: Landmark, perm: ["banking.view"] },
      { href: "/banking/expenses", label: "Expenses", icon: ArrowUpFromLine, perm: ["banking.view"] },
      { href: "/banking/income", label: "Other income", icon: ArrowDownToLine, perm: ["banking.view"] },
      { href: "/banking/transfers", label: "Transfers", icon: Repeat, perm: ["banking.view"] },
    ],
  },
  {
    section: "Accounting",
    items: [
      { href: "/accounting/chart", label: "Chart of accounts", icon: ListTree, perm: ["ledgeraccounts.view"] },
      { href: "/accounting/journals", label: "Journal entries", icon: NotebookPen, perm: ["journals.view"] },
      { href: "/accounting/reports", label: "Reports", icon: ChartPie, perm: ["reports.view"] },
      { href: "/accounting/trial-balance", label: "Trial balance", icon: Scale, perm: ["reports.view"] },
      { href: "/accounting/budgets", label: "Budgets", icon: Target, perm: ["budgets.view"] },
      { href: "/accounting/cost-centres", label: "Cost centres", icon: Tags, perm: ["budgets.view"] },
      { href: "/accounting/fixed-assets", label: "Fixed assets", icon: Building2, perm: ["fixedassets.view"] },
      { href: "/accounting/opening-balances", label: "Opening balances", icon: BookOpenCheck, perm: ["openingbalances.view"] },
      { href: "/accounting/years", label: "Financial years", icon: CalendarRange, perm: ["fiscalyears.view", "periods.view"] },
      { href: "/accounting/currencies", label: "Currencies", icon: Coins, perm: ["currencies.view"] },
      { href: "/accounting/tax-rates", label: "Tax rates", icon: Percent, perm: ["taxrates.view"] },
    ],
  },
  {
    section: "Projects",
    items: [{ href: "/projects", label: "Projects", icon: FolderKanban, perm: ["projects.view"] }],
  },
  {
    section: "People",
    items: [
      { href: "/me", label: "My leave and pay", icon: UserRound, perm: ["leave.request"] },
      { href: "/leave", label: "Leave", icon: CalendarDays, perm: ["leave.view", "leave.approve"] },
      { href: "/work-reports", label: "Work reports", icon: FileBarChart, perm: null },
      { href: "/payroll", label: "Payroll", icon: WalletIcon, perm: ["payroll.view"] },
    ],
  },
  {
    section: "Organisation",
    items: [
      { href: "/employees", label: "Employees", icon: Users, perm: ["employees.view", "employees.view_own"] },
      { href: "/departments", label: "Departments", icon: Network, perm: ["departments.view"] },
      { href: "/branches", label: "Branches", icon: Building, perm: ["branches.view"] },
      { href: "/team", label: "Team and access", icon: UserCog, perm: ["members.view"] },
      { href: "/roles", label: "Roles", icon: ShieldCheck, perm: ["roles.view"] },
      { href: "/approvals/rules", label: "Approval rules", icon: ListChecks, perm: ["approvals.view"] },
      { href: "/etims", label: "KRA eTIMS", icon: BadgeCheck, perm: ["etims.view"] },
      { href: "/mpesa", label: "M-Pesa (Daraja)", icon: Smartphone, perm: ["mpesa.view"] },
      { href: "/audit-log", label: "Audit log", icon: History, perm: ["auditlogs.view"] },
      { href: "/settings", label: "Settings", icon: Settings, perm: ["workspace.manage"] },
    ],
  },
  { section: "Help", items: [{ href: "/guide", label: "User guides", icon: BookOpen, perm: null }] },
];

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const slug = useWorkspaceSlug();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const ctx = useWorkspaceContextQuery(slug);

  if (ctx.isLoading) {
    return (
      <>
        <TopBar />
        <div className="px-6">
          <Spinner label="Opening workspace" />
        </div>
      </>
    );
  }
  if (ctx.error || !ctx.data) {
    return (
      <>
        <TopBar />
        <div className="mx-auto max-w-xl px-4 py-10">
          <ErrorState error={ctx.error} />
          <Link href="/workspaces" className="mt-4 inline-block text-sm text-brand-700 underline">
            Back to your workspaces
          </Link>
        </div>
      </>
    );
  }

  const context = ctx.data;
  const base = `/w/${slug}`;
  const allowed = (item: NavItem) =>
    (item.href !== "/etims" || context.etims_enabled) && // hidden until KRA approves MannaBooks and signing is switched on
    (!item.perm || item.perm.some((code) => grants(context.permissions, code)));
  const sections = NAV.map((s) => ({ ...s, items: s.items.filter(allowed) })).filter((s) => s.items.length > 0);

  const nav = (
    <nav className="space-y-4 overflow-y-auto p-3">
      {sections.map((section) => (
        <div key={section.section ?? "main"} className="space-y-0.5">
          {section.section && <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-stone-400">{section.section}</p>}
          {section.items.map(({ href, label, icon: Icon }) => {
            const target = base + href;
            const active = href === "" || href === "/pos" || href === "/inventory" || href === "/banking" ? pathname === target || (href === "/inventory" && pathname.startsWith(`${target}/products`)) || (href === "/banking" && /^\/w\/[^/]+\/banking\/(accounts|reconciliations)/.test(pathname)) : pathname.startsWith(target);
            return (
              <Link
                key={href}
                href={target}
                onClick={() => setMenuOpen(false)}
                className={clsx(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm",
                  active ? "bg-brand-50 font-medium text-brand-700" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden /> {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <WorkspaceProvider slug={slug} context={context}>
      <PeriodProvider slug={slug} context={context}>
      <TopBar>
        <button className="rounded p-1.5 text-stone-600 hover:bg-stone-100 md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          <Menu className="h-5 w-5" />
        </button>
        <Link
          href="/workspaces"
          className="hidden items-center gap-1.5 rounded-md border border-stone-200 px-2.5 py-1 text-sm text-stone-700 hover:bg-stone-50 sm:flex"
          title="Switch workspace"
        >
          <span className="max-w-48 truncate">{context.workspace.name}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-stone-400" />
        </Link>
        <PeriodSwitcher />
      </TopBar>
      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 overflow-y-auto border-r border-stone-200 bg-white md:block">{nav}</aside>
        {menuOpen && <aside className="fixed inset-x-0 top-14 z-20 border-b border-stone-200 bg-white shadow md:hidden">{nav}</aside>}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">{children}</main>
        <PeriodFixDialog />
      </div>
      </PeriodProvider>
    </WorkspaceProvider>
  );
}
