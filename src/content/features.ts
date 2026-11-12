/**
 * The /features page: everything MannaBooks does, grouped by the part of the business it serves. Each item links to
 * its guide in src/content/guides. `module` is the plan module (src/lib/plans.ts) for "Included in"; leave it out for
 * what every plan has. Mark recent work `isNew` for the first months after it ships.
 */
import {
  BarChart3, Boxes, Building2, CheckCheck, Landmark, type LucideIcon, ReceiptText, ShieldCheck, Smartphone, Store, Users, Wallet,
} from "lucide-react";

/** `module`: when the item is in different plans from the rest of its group. */
export type FeatureItem = { name: string; text: string; guide?: string; isNew?: boolean; module?: string };
export type FeatureGroup = {
  id: string;
  icon: LucideIcon;
  title: string;
  summary: string;
  module?: string;
  items: FeatureItem[];
};

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: "sell", icon: ReceiptText, title: "Sell and get paid", module: "sales",
    summary: "From the first quotation to the money in the bank, with KRA PIN and VAT on every document.",
    items: [
      { name: "Quotations", text: "Send a quotation as a PDF or a link the customer accepts or declines online, then turn it into an invoice in one click.", guide: "quotations" },
      { name: "Shareable catalogues", text: "Share your products by link, PDF or QR code. Clients pick what they want and get a quotation, sent at once or after you check it.", guide: "catalogues", isNew: true },
      { name: "Invoices and payment links", text: "Invoices with their own private link where the customer sees what they owe and pays.", guide: "invoices" },
      { name: "Cash sales", text: "A receipt for money taken on the spot, by cash, M-Pesa, card or bank.", guide: "cash-sales" },
      { name: "Discounts", text: "A percentage or an amount off a line, or off the whole document. The discount is shared over the lines, so KRA sees it on each one.", guide: "invoices", isNew: true },
      { name: "Price lists", text: "Wholesale, contract or member prices that fill in by themselves for the right customers.", guide: "price-lists" },
      { name: "Recurring invoices", text: "Rent, fees, retainers and service charges invoiced every month without lifting a finger.", guide: "recurring-invoices" },
      { name: "Statements and reminders", text: "Customer statements and polite payment reminders before and after the due date.", guide: "reminders" },
      { name: "Credit notes and delivery notes", text: "Returns and corrections done properly, and delivery notes customers sign.", guide: "credit-notes" },
      { name: "Other currencies", text: "Invoice in dollars or euros, with the exchange gain or loss worked out when you are paid.", guide: "currencies" },
    ],
  },
  {
    id: "mpesa", icon: Smartphone, title: "M-Pesa built in", module: "sales",
    summary: "Your own paybill or till, connected through your own Daraja account, so the money goes straight to you.",
    items: [
      { name: "Payment prompts", text: "Send a prompt to the customer's phone from an invoice or the till. They enter their PIN and it is marked paid.", guide: "mpesa" },
      { name: "Paybill payments that find their invoice", text: "Customers pay with the invoice number as the account number, and the payment matches itself.", guide: "mpesa" },
      { name: "No reading SMS", text: "Payments come in from Safaricom, not from screenshots, so nobody has to check messages by hand.", guide: "payments" },
    ],
  },
  {
    id: "till", icon: Store, title: "Till, loyalty and online shop", module: "pos",
    summary: "A fast till for shops, restaurants and salons, and an online shop that uses the same products and stock.",
    items: [
      { name: "Till with shifts", text: "Each cashier opens a shift with a float and counts the drawer at the end. Any shortage shows the same day.", guide: "pos" },
      { name: "Sell by the piece or the carton", text: "Products in several units, each with its own price, taking the right amount out of stock.", guide: "products" },
      { name: "Gift vouchers", text: "Sell vouchers or give them away. They are spent at the till or against an invoice, in parts if needed, and print with a QR code.", guide: "gift-vouchers", isNew: true, module: "sales" },
      { name: "Loyalty points", text: "Customers earn points as they buy and spend them as a discount at the till, with tiers for your best regulars.", guide: "loyalty" },
      { name: "Online shop", text: "Your own shop page for pickup or delivery orders, paid by M-Pesa or on delivery.", guide: "online-shop" },
    ],
  },
  {
    id: "stock", icon: Boxes, title: "Buy and keep stock", module: "inventory",
    summary: "From the LPO to the shelf, with stock valued at average cost in every warehouse.",
    items: [
      { name: "Purchase orders (LPOs)", text: "Orders to suppliers that can go up an approval chain before they are sent.", guide: "purchase-orders" },
      { name: "Goods received and bills", text: "Record deliveries against the LPO, then the supplier's bill, with withholding tax worked out.", guide: "goods-received" },
      { name: "Payment vouchers", text: "Supplier payments prepared, approved and paid, with the vouchers to file.", guide: "payment-vouchers" },
      { name: "Stock in every warehouse", text: "Average cost, transfers between warehouses and branches, and low-stock warnings.", guide: "inventory" },
      { name: "Stock takes", text: "Count what is on the shelf and see the difference in quantity and value before you post it.", guide: "stock-takes" },
      { name: "Recipes and production", text: "Dishes, drinks and manufactured goods costed from their ingredients, taken out of stock as they are made or sold.", guide: "manufacturing" },
      { name: "Add many products at once", text: "A full page to type or paste a long list of products, instead of one at a time.", guide: "products", isNew: true },
    ],
  },
  {
    id: "money", icon: Landmark, title: "Cash and banking", module: "banking",
    summary: "Every bank, M-Pesa and cash account in the books, reconciled month by month.",
    items: [
      { name: "Bank, M-Pesa and cash accounts", text: "Balances that move with every sale, bill and payslip.", guide: "banking" },
      { name: "Statement import and reconciliation", text: "Bring in the bank or M-Pesa statement, match it to the books and close the month.", guide: "bank-reconciliation" },
      { name: "Expenses and other income", text: "Rent, fuel and small costs with their VAT, and income that isn't a sale.", guide: "expenses" },
    ],
  },
  {
    id: "people", icon: Wallet, title: "Payroll and people", module: "people",
    summary: "Kenyan payroll that is right every month, for permanent staff and casual workers alike.",
    items: [
      { name: "PAYE, SHIF, NSSF and Housing Levy", text: "Worked out for you, with the remittance schedules and payslips staff open on their phones.", guide: "payroll" },
      { name: "Casual and waged workers", text: "Pay by the month, the day or the hour, in casual pay runs whenever you need one. Monthly casuals too.", guide: "payroll", isNew: true },
      { name: "Statutory deductions per person", text: "Choose for each person which of PAYE, NSSF, SHIF and the Housing Levy apply.", guide: "payroll", isNew: true },
      { name: "Leave, working week and holidays", text: "Leave balances that count only working days, using your working week and Kenya's public holidays.", guide: "leave", isNew: true },
      { name: "Staff self-service", text: "Staff update their own contact details; changes to bank or M-Pesa details wait for HR to approve.", guide: "self-service", isNew: true },
      { name: "Work reports", text: "Ask for weekly or monthly reports, with reminders, review and an overdue list. Admins can set them up for someone else.", guide: "work-reports" },
    ],
  },
  {
    id: "control", icon: CheckCheck, title: "Approvals, budgets and departments", module: "control",
    summary: "Spending goes up the chain before it counts, and every department knows its numbers.",
    items: [
      { name: "Approval chains", text: "Orders, vouchers, payroll and budgets approved by the right people, by amount.", guide: "approvals" },
      { name: "Budgets month by month", text: "For the whole business, a department, a cost centre or a project, compared with the actual figures every month.", guide: "budgets" },
      { name: "Department budgets", text: "Department heads draft their own budget and send it to finance, who approve it.", guide: "budgets", isNew: true },
      { name: "My department", text: "A page for each head: their people, leave waiting, the department's money against its budget, and late reports.", guide: "departments", isNew: true },
      { name: "Cost centres and projects", text: "Tag sales and costs to a branch, crop, vehicle or job, and see the profit of each.", guide: "projects", module: "projects" },
      { name: "Fixed assets", text: "A register of vehicles, computers and equipment, with monthly depreciation and the gain or loss when you sell.", guide: "fixed-assets" },
    ],
  },
  {
    id: "reports", icon: BarChart3, title: "Reports and analytics", module: "sales",
    summary: "Accounts that are always up to date, because every document posts to the books as it happens.",
    items: [
      { name: "Business analytics", text: "One page for today: sales against last month, money in, what is overdue or due soon, and quotes waiting.", guide: "analytics", isNew: true },
      { name: "Financial statements", text: "Profit and loss, balance sheet and trial balance, by month, branch, department or project.", guide: "financial-reports" },
      { name: "Who owes you, and what you owe", text: "Aged receivables and payables, with statements to send.", guide: "financial-reports" },
      { name: "VAT summary", text: "Output and input VAT for the month, ready for your return.", guide: "tax-rates" },
      { name: "Excel and PDF", text: "Print any report, or export it to Excel for your accountant.", guide: "import-and-export" },
    ],
  },
  {
    id: "kenya", icon: ShieldCheck, title: "Made for Kenya",
    summary: "Built around KRA, Safaricom and the deductions you deal with every month, not adapted from somewhere else.",
    items: [
      { name: "KRA PIN and VAT", text: "On every document, with VAT inclusive or exclusive prices and zero-rated and exempt items.", guide: "tax-rates" },
      { name: "Withholding tax", text: "Withholding VAT and income tax on supplier payments, and what customers withhold from you.", guide: "supplier-payments" },
      { name: "KRA eTIMS", text: "Signing of invoices and receipts, switching on once KRA approves MannaBooks.", guide: "etims" },
    ],
  },
  {
    id: "team", icon: Users, title: "Your team and your businesses",
    summary: "Give each person the access their job needs, and run more than one business from one sign-in.",
    items: [
      { name: "Roles and permissions", text: "Owners, accountants, sales, cashiers, store managers and HR, or roles of your own.", guide: "team-and-roles" },
      { name: "Access limited to a department", text: "Someone who works for one department sees only its documents, reports and budgets.", guide: "departments" },
      { name: "Audit log", text: "Every change recorded: who, what and when.", guide: "audit-log" },
      { name: "Your logo on everything", text: "Upload your logo once and it shows on documents, PDFs, the online shop and customer links.", guide: "workspace-settings", isNew: true },
      { name: "CRM", text: "Leads, deals and follow-ups, turning into quotations when you win.", guide: "crm", module: "crm" },
      { name: "Import and export", text: "Bring in customers, products and opening balances from a spreadsheet.", guide: "import-and-export" },
    ],
  },
  {
    id: "groups", icon: Building2, title: "Groups of companies", module: "company_groups",
    summary: "For owners and accountants with several companies.",
    items: [
      { name: "One sign-in for every business", text: "Switch between companies, or between your clients' books, in one click.", guide: "company-groups" },
      { name: "Intercompany transactions", text: "Sales, loans and repayments between companies posted on both sides at once.", guide: "company-groups" },
      { name: "Consolidated reports", text: "Profit and loss and balance sheet for the whole group.", guide: "company-groups" },
      { name: "Business inbox", text: "Send invoices and orders straight into another MannaBooks business's inbox.", guide: "business-inbox" },
    ],
  },
];

/** The landing page's short overview: one card per group, linking to its section. */
export const FEATURE_HIGHLIGHTS = ["sell", "mpesa", "till", "stock", "money", "people", "control", "reports"];
