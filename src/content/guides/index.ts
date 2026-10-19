/**
 * The user guides. Each module adds its guide here and a markdown file beside this one.
 * Every guide is shown inside the app (/w/<workspace>/guide); `audience: "internal"` keeps one out of
 * the public guides (/guide), e.g. a guide that only makes sense to signed-in staff.
 */
export interface Guide {
  slug: string;
  title: string;
  summary: string;
  section: string;
  /** The app screen it explains, relative to the workspace (for "Open ..." inside the app). */
  app?: string;
  audience?: "everyone" | "internal";
}

export const GUIDES: Guide[] = [
  { slug: "getting-started", title: "Getting started", summary: "Create your account and workspace, and set it up in five steps.", section: "Start here" },
  { slug: "workspace-settings", title: "Workspace settings", summary: "Business details, KRA PIN, VAT, financial year and numbering.", section: "Organisation", app: "/settings" },
  { slug: "branches", title: "Branches", summary: "The shops, offices and sites you operate from.", section: "Organisation", app: "/branches" },
  { slug: "departments", title: "Departments and in-charges", summary: "Group staff, and decide who is in charge of each module.", section: "Organisation", app: "/departments" },
  { slug: "self-service", title: "My leave and pay", summary: "Your leave days, leave requests and payslips.", section: "People", app: "/me" },
  { slug: "leave", title: "Leave", summary: "Asking for, approving and tracking leave.", section: "People", app: "/leave" },
  { slug: "work-reports", title: "Work reports", summary: "Ask your team for regular reports, and submit your own.", section: "People", app: "/work-reports" },
  { slug: "payroll", title: "Payroll", summary: "PAYE, SHIF, NSSF and Housing Levy, payslips and paying staff.", section: "People", app: "/payroll" },
  { slug: "employees", title: "Employees and self-service", summary: "Staff records, reporting lines and giving staff a login.", section: "People", app: "/employees" },
  { slug: "team-and-roles", title: "Team, roles and access", summary: "Invite people, choose their role, and control what they can do.", section: "People", app: "/team" },
  { slug: "audit-log", title: "Audit log", summary: "See who changed what, and when.", section: "Control", app: "/audit-log" },
  { slug: "customers", title: "Customers", summary: "Who you sell to, what they owe, and their statements.", section: "Sales", app: "/sales/customers" },
  { slug: "products", title: "Products and services", summary: "What you sell, at what price and VAT rate.", section: "Sales", app: "/sales/products" },
  { slug: "quotations", title: "Quotations", summary: "Offer a price, follow it up and turn it into an invoice.", section: "Sales", app: "/sales/quotations" },
  { slug: "invoices", title: "Invoices", summary: "Bill customers on credit, and correct or void invoices.", section: "Sales", app: "/sales/invoices" },
  { slug: "payments", title: "Customer payments", summary: "Record M-Pesa, bank and cash payments against invoices.", section: "Sales", app: "/sales/payments" },
  { slug: "cash-sales", title: "Cash sales", summary: "Sales paid on the spot, with a printed receipt.", section: "Sales", app: "/sales/cash-sales" },
  { slug: "credit-notes", title: "Credit notes", summary: "Returns, overcharges and discounts after the sale.", section: "Sales", app: "/sales/credit-notes" },
  { slug: "debit-notes", title: "Debit notes", summary: "Charge more against an invoice already issued.", section: "Sales", app: "/sales/debit-notes" },
  { slug: "delivery-notes", title: "Delivery notes", summary: "Send goods and get them signed for.", section: "Sales", app: "/sales/delivery-notes" },
  { slug: "recurring-invoices", title: "Recurring invoices", summary: "Rent, retainers and contracts invoiced on a schedule.", section: "Sales", app: "/sales/recurring-invoices" },
  { slug: "reminders", title: "Payment reminders", summary: "Emails to customers before and after invoices fall due.", section: "Sales", app: "/sales/reminders" },
  { slug: "customer-portal", title: "Sharing with customers", summary: "Private links to invoices and statements, with M-Pesa pay.", section: "Sales" },
  { slug: "catalogue", title: "Categories and units", summary: "Group products and choose the units you sell in.", section: "Sales", app: "/sales/catalogue" },
  { slug: "price-lists", title: "Price lists", summary: "Wholesale, staff and contract prices for groups of customers.", section: "Sales", app: "/sales/price-lists" },
  { slug: "pos", title: "Point of sale", summary: "Sell at the till, run shifts and count the cash.", section: "Point of sale", app: "/pos" },
  { slug: "loyalty", title: "Loyalty", summary: "Points, tiers and rewards for returning customers.", section: "Point of sale", app: "/sales/loyalty" },
  { slug: "mpesa", title: "M-Pesa (Daraja)", summary: "Connect your paybill or till for prompts and automatic matching.", section: "Point of sale", app: "/mpesa" },
  { slug: "etims", title: "KRA eTIMS", summary: "How documents get signed by KRA, and setting up your device.", section: "Sales", app: "/etims" },
  { slug: "suppliers", title: "Suppliers", summary: "Who you buy from, what you owe and withholding tax.", section: "Purchasing", app: "/purchasing/suppliers" },
  { slug: "purchase-orders", title: "Purchase orders (LPOs)", summary: "Order goods, get them approved and print the LPO.", section: "Purchasing", app: "/purchasing/orders" },
  { slug: "service-orders", title: "Service orders", summary: "Order work from suppliers and confirm it is done.", section: "Purchasing", app: "/purchasing/service-orders" },
  { slug: "goods-received", title: "Goods received", summary: "Record deliveries and put stock into the warehouse.", section: "Purchasing", app: "/purchasing/receipts" },
  { slug: "bills", title: "Bills", summary: "Enter supplier invoices, input VAT and what you owe.", section: "Purchasing", app: "/purchasing/bills" },
  { slug: "payment-vouchers", title: "Payment vouchers", summary: "Approve payments to suppliers before money goes out.", section: "Purchasing", app: "/purchasing/vouchers" },
  { slug: "supplier-payments", title: "Supplier payments", summary: "Payments to suppliers and withholding tax.", section: "Purchasing", app: "/purchasing/payments" },
  { slug: "inventory", title: "Inventory", summary: "Stock levels, average cost, warehouses, transfers and adjustments.", section: "Inventory", app: "/inventory" },
  { slug: "stock-takes", title: "Stock takes", summary: "Count your stock and post the differences.", section: "Inventory", app: "/inventory/stock-takes" },
  { slug: "manufacturing", title: "Manufacturing", summary: "Recipes and production orders for what you make.", section: "Inventory", app: "/manufacturing/production" },
  { slug: "banking", title: "Cash and banking", summary: "Bank, M-Pesa and cash accounts, and moving money between them.", section: "Cash and banking", app: "/banking" },
  { slug: "expenses", title: "Expenses", summary: "Costs paid on the spot, with their VAT.", section: "Cash and banking", app: "/banking/expenses" },
  { slug: "other-income", title: "Other income", summary: "Interest, rent received and other money that isn't a sale.", section: "Cash and banking", app: "/banking/income" },
  { slug: "bank-reconciliation", title: "Bank reconciliation", summary: "Import statements, match them and prove the books are right.", section: "Cash and banking", app: "/banking" },
  { slug: "chart-of-accounts", title: "Chart of accounts", summary: "The accounts your money is recorded in, and their balances.", section: "Accounting", app: "/accounting/chart" },
  { slug: "journal-entries", title: "Journal entries", summary: "Record, post and reverse entries in the books.", section: "Accounting", app: "/accounting/journals" },
  { slug: "opening-balances", title: "Opening balances", summary: "Start MannaBooks with the balances you already have.", section: "Accounting", app: "/accounting/opening-balances" },
  { slug: "financial-years", title: "Financial years and periods", summary: "Lock finished months and close the year.", section: "Accounting", app: "/accounting/years" },
  { slug: "currencies", title: "Currencies and exchange rates", summary: "Trade in other currencies at the right rate.", section: "Accounting", app: "/accounting/currencies" },
  { slug: "tax-rates", title: "Tax rates", summary: "VAT, withholding taxes and KRA eTIMS codes.", section: "Accounting", app: "/accounting/tax-rates" },
  { slug: "trial-balance", title: "Trial balance", summary: "Every balance on a date, and proof the books balance.", section: "Accounting", app: "/accounting/trial-balance" },
  { slug: "approvals", title: "Approvals", summary: "Approval chains for orders, vouchers, payroll and budgets.", section: "Control", app: "/approvals" },
  { slug: "budgets", title: "Budgets", summary: "Plan the year month by month and compare it with what happened.", section: "Accounting", app: "/accounting/budgets" },
  { slug: "fixed-assets", title: "Fixed assets", summary: "The asset register, monthly depreciation, and selling or scrapping assets.", section: "Accounting", app: "/accounting/fixed-assets" },
  { slug: "cost-centres", title: "Cost centres", summary: "Track the profit of a shop, vehicle, farm or programme on its own.", section: "Accounting", app: "/accounting/cost-centres" },
  { slug: "projects", title: "Projects", summary: "Job costing: the income, costs and profit of each job or contract.", section: "Projects", app: "/projects" },
  { slug: "financial-reports", title: "Financial reports", summary: "Profit and loss, balance sheet, ageing and the VAT summary.", section: "Accounting", app: "/accounting/reports" },
];

export const PUBLIC_GUIDES = GUIDES.filter((g) => g.audience !== "internal");

export function findGuide(slug: string, internal = false): Guide | undefined {
  return (internal ? GUIDES : PUBLIC_GUIDES).find((g) => g.slug === slug);
}

export function guideSections(guides: Guide[]): string[] {
  return [...new Set(guides.map((g) => g.section))];
}
