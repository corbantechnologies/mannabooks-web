/**
 * Jobs many industries share, at /use-cases and /use-cases/[slug]. Which industries use each one comes from
 * INDUSTRIES[].useCases, so the two lists can't drift apart.
 */
import {
  BadgePercent, Boxes, Building2, ChefHat, Gift, Globe, HandCoins, Handshake, Link2, Network, PackageOpen, Receipt, Repeat, Ruler, ShieldCheck, Smartphone, Store, Wallet,
  type LucideIcon,
} from "lucide-react";

import { INDUSTRIES } from "./industries";

export type UseCase = {
  slug: string;
  icon: LucideIcon;
  title: string;
  summary: string;
  /** The plan module (or feature) it needs, for "Included in". */
  module: string;
  problem: string;
  steps: { title: string; text: string }[];
  outcomes: string[];
  guide: string;
};

export const USE_CASES: UseCase[] = [
  {
    slug: "get-paid-by-mpesa", icon: Smartphone, title: "Get paid by M-Pesa", module: "sales", guide: "mpesa",
    summary: "Payment prompts to customers' phones, and paybill payments that match themselves to invoices.",
    problem: "Checking M-Pesa messages against invoices by hand is slow and easy to get wrong, and money sits unmatched for days.",
    steps: [
      { title: "Connect your own Daraja account", text: "Your paybill or till, so the money goes straight to you." },
      { title: "Send a prompt", text: "From an invoice or the till, send a payment prompt to the customer's phone. They enter their PIN; the invoice is paid." },
      { title: "Or let them pay your paybill", text: "With the invoice number as the account number, the payment finds its invoice." },
      { title: "Share a payment link", text: "Every invoice has a private link where the customer sees it and pays." },
    ],
    outcomes: ["No reading SMS to confirm payments", "Invoices marked paid as the money arrives", "M-Pesa balance in the books, ready to reconcile"],
  },
  {
    slug: "sell-at-the-till", icon: Store, title: "Sell at the till", module: "pos", guide: "pos",
    summary: "A fast till with shifts, cash counts, M-Pesa and loyalty points.",
    problem: "Cash that doesn't match the sales, and no way to tell which shift was short.",
    steps: [
      { title: "Open a shift", text: "Each cashier opens their own shift with a float." },
      { title: "Sell", text: "Search for products, sell by the piece or the carton, take cash, M-Pesa or both." },
      { title: "Reward regulars", text: "Customers earn loyalty points and redeem them at the till." },
      { title: "Close and count", text: "The count is compared with the shift's cash sales and any difference recorded." },
    ],
    outcomes: ["Every shilling traced to a cashier and shift", "Stock taken out as you sell", "Daily sales and profit without waiting for month end"],
  },
  {
    slug: "track-stock", icon: Boxes, title: "Keep stock you can trust", module: "inventory", guide: "inventory",
    summary: "Stock in every warehouse at average cost, with transfers, stock takes and low-stock warnings.",
    problem: "Stock figures that never match the shelf, and a cost of sales nobody believes.",
    steps: [
      { title: "Receive goods", text: "Goods received against LPOs add stock at its cost." },
      { title: "Sell", text: "Invoices, cash sales and the till take stock out at average cost." },
      { title: "Move it", text: "Transfer stock between warehouses and branches." },
      { title: "Count it", text: "Stock takes compare the shelf with the books and post the difference." },
    ],
    outcomes: ["Stock value on the balance sheet that is right", "Cost of sales from real costs", "Know what to reorder before you run out"],
  },
  {
    slug: "buy-bulk-sell-small", icon: Ruler, title: "Buy in bulk, sell in small quantities", module: "inventory", guide: "products",
    summary: "Buy timber by the piece and sell it by the foot, or cement by the bag and sell it by the kg, with stock and margins right in both.",
    problem: "You buy a 14 ft length and sell 3 ft here and 5 ft there, so stock in the books never matches the yard, nobody knows the real margin per foot, and offcuts quietly eat the profit.",
    steps: [
      { title: "Set the unit you sell in", text: "Add each size once (2x2, 3x2, 4x2) in the unit you sell it in, such as the foot or the metre. Quantities can have decimals, so 2.5 ft is fine." },
      { title: "Add the units you buy in", text: "Under Other units: a piece (1 piece = 14 ft) or a bundle, each with its own price if you sell whole pieces cheaper per foot." },
      { title: "Order and receive in pieces", text: "LPOs, deliveries and the supplier's bill in pieces or bundles. Stock goes up in feet, at the average cost per foot, as prices change." },
      { title: "Sell by the foot", text: "At the till or on an invoice, choose the unit and the quantity. Stock comes out in feet and each sale shows its cost and margin." },
      { title: "Account for offcuts", text: "Record offcuts, splits and warped timber as stock adjustments, and count the yard with a stock take to see what cutting really costs." },
    ],
    outcomes: ["Stock right in feet and in pieces", "Margin per foot on every sale, not just at month end", "Offcuts and waste in shillings", "Cutting or delivery charged as its own line"],
  },
  {
    slug: "cost-recipes", icon: ChefHat, title: "Cost recipes and production", module: "manufacturing", guide: "manufacturing",
    summary: "Know what each dish, drink or product costs to make, and cost every production run.",
    problem: "Prices set by guesswork because nobody knows what a product really costs to make.",
    steps: [
      { title: "Write the recipe", text: "List the ingredients or raw materials for one unit." },
      { title: "See cost and margin", text: "MannaBooks prices it at average cost and shows the margin at your selling price." },
      { title: "Make to order or in batches", text: "Dishes take out ingredients when sold; batches go through production orders." },
    ],
    outcomes: ["Prices set from real costs", "Ingredients and materials that reconcile", "Margins that update when costs change"],
  },
  {
    slug: "run-payroll", icon: Wallet, title: "Run Kenyan payroll", module: "people", guide: "payroll",
    summary: "PAYE, SHIF, NSSF and the Housing Levy worked out, with payslips on staff phones.",
    problem: "Statutory deductions worked out in spreadsheets, and payslips nobody can find.",
    steps: [
      { title: "Add your staff", text: "Pay, allowances and deductions for each employee." },
      { title: "Run the payroll", text: "MannaBooks works out PAYE, SHIF, NSSF and the Housing Levy." },
      { title: "Approve and pay", text: "The pay run goes for approval, then posts to the books." },
      { title: "Share payslips", text: "Staff open their payslips and ask for leave on their phones." },
    ],
    outcomes: ["Deductions at the current rates", "Remittance schedules ready for each authority", "Leave balances kept for you"],
  },
  {
    slug: "collect-payments", icon: Link2, title: "Take payments with a link", module: "sales", guide: "payment-links",
    summary: "One link or QR code for a deposit, a fee, tickets or donations, paid by M-Pesa or card and recorded as the right thing.",
    problem: "You send your paybill number, then spend the evening matching M-Pesa messages to people, and deposits, offerings and ticket money never reach the books properly.",
    steps: [
      { title: "Make a link", text: "Say what the money is for: a sale, a deposit, a donation or a gift voucher. Set a fixed price, a product, or let the payer choose the amount." },
      { title: "Share it", text: "Copy it to WhatsApp, email it, or print the QR code on a poster, a counter card or a notice board." },
      { title: "They pay", text: "By M-Pesa prompt or by card, on a simple page with your logo. They get a receipt; you get an email." },
      { title: "It is recorded for you", text: "A sale becomes a cash sale with VAT, a deposit waits for the customer's invoice, a donation goes to income, and a voucher is emailed." },
    ],
    outcomes: ["No matching M-Pesa messages by hand", "Deposits kept under the right customer", "Views, payments and money collected per link", "Close it on a date or after a number of payments"],
  },
  {
    slug: "reward-customers", icon: Gift, title: "Reward and bring back customers", module: "pos", guide: "gift-vouchers",
    summary: "Gift vouchers, loyalty points and discounts that keep regulars coming back, with the books kept right.",
    problem: "Paper vouchers get copied or lost, nobody knows how much is still owed on them, and discounts are given by eye at the till with no record of what they cost.",
    steps: [
      { title: "Sell gift vouchers", text: "Sell a voucher for any amount, or give one away as a promotion. Each has a code that is hard to guess, an expiry date if you want one, and a PDF with a QR code to print or send." },
      { title: "Let them spend it", text: "At the till or against an invoice, the voucher pays what it holds and the rest is paid by cash or M-Pesa. It can be spent in parts until nothing is left." },
      { title: "Reward regulars", text: "Loyalty members earn points as they buy, move up tiers, and spend points at the till as a discount." },
      { title: "Give discounts that are recorded", text: "A percentage or an amount off a line or off the whole sale. MannaBooks shares it over the lines, so KRA sees it on each one." },
    ],
    outcomes: ["What is still owed on vouchers, always in the balance sheet", "Expired vouchers turned into income automatically", "Every discount recorded, not guessed", "Regulars with a reason to come back"],
  },
  {
    slug: "pay-casual-workers", icon: HandCoins, title: "Pay casual and daily workers", module: "people", guide: "payroll",
    summary: "Casuals paid by the day or the hour, on their own pay runs, with only the deductions that apply to them.",
    problem: "Casual labour is paid from petty cash with a list in a notebook, so wages never reach the books properly and the deductions are a guess.",
    steps: [
      { title: "Add each worker once", text: "Paid by the month, the day or the hour, with their rate. Tick which of PAYE, NSSF, SHIF and the Housing Levy apply to them." },
      { title: "Run a casual pay run", text: "For any period: a week of harvesting, a month on site. Enter the days or hours worked and the pay is worked out." },
      { title: "Approve and pay", text: "The run is approved like monthly payroll, then posts to the books with any deductions due." },
      { title: "Monthly casuals too", text: "Casuals kept on all year can sit on the monthly payroll with everyone else, paid by the day." },
    ],
    outcomes: ["Wages in the books, not in a notebook", "The right deductions for each worker", "Payslips casuals can open on their phones", "Labour cost per site, crop or job with cost centres"],
  },
  {
    slug: "run-departments", icon: Building2, title: "Give every department its own numbers", module: "control", guide: "departments",
    summary: "Department budgets that heads draft and finance approves, a page for each head, and access limited to their department.",
    problem: "Heads of department are measured against numbers they never see, budgets are an annual spreadsheet, and anyone with access sees every department's figures.",
    steps: [
      { title: "Set up departments", text: "Departments with their heads and cost centres. Documents and journal lines are tagged to them." },
      { title: "Heads draft their budget", text: "Month by month, for the financial year. They send it for approval; finance or the CEO approves it through the approval chain." },
      { title: "Each head has My department", text: "Their people and who is on leave, leave waiting for them, the department's income and costs against its budget, and late work reports." },
      { title: "Limit what people see", text: "Someone who works for one department sees only its documents, reports and budgets." },
    ],
    outcomes: ["Heads own the number they are measured against", "Profit and loss by department every month", "Spending checked against the department's budget", "Nobody sees another department's figures by accident"],
  },
  {
    slug: "sell-without-stock", icon: PackageOpen, title: "Sell without keeping stock", module: "sales", guide: "catalogues",
    summary: "Quote first, buy from your supplier once the client says yes, then invoice, and see what each order made.",
    problem: "You source what clients ask for, or sell your time, so there is no shelf to count. Stock software gets in the way, quotes take hours, and you only learn what an order made when the month closes.",
    steps: [
      { title: "Add what you sell, with stock off", text: "Products with Track stock unticked have a price, VAT and a picture, but never a stock count. Services work the same way. A one-off item goes straight on a quotation as a free-text line." },
      { title: "Let the client choose", text: "Send a catalogue link or PDF. Their picks become a quotation, which they accept on the same link. Or write the quotation yourself." },
      { title: "Buy on order", text: "Once it is accepted, send your supplier a purchase order (LPO) and record their bill. Tag both, and the client's invoice, to a project for this order." },
      { title: "Invoice and get paid", text: "Convert the quotation to an invoice in one click. The client pays by M-Pesa prompt, paybill or bank." },
      { title: "See the margin", text: "The project shows what you sold for, what it cost and what you made. Analytics shows what is owed on both sides." },
    ],
    outcomes: ["No stock counts to keep", "Profit on every order, not just every month", "Quotations in minutes", "What clients owe you and what you owe suppliers, side by side"],
  },
  {
    slug: "job-costing", icon: Receipt, title: "Cost every job", module: "projects", guide: "projects",
    summary: "Projects with their own income, costs and profit, from quotation to final invoice.",
    problem: "Knowing a job lost money only after it is finished.",
    steps: [
      { title: "Open a project", text: "One for each job, contract or client engagement." },
      { title: "Tag income and costs", text: "Invoices, bills, expenses and subcontractor work are tagged to the project." },
      { title: "Watch it", text: "The project report shows income, costs and profit as the job goes." },
    ],
    outcomes: ["Profit per job while you can still act", "Better quotes next time", "Subcontractor costs in one place"],
  },
  {
    slug: "recurring-billing", icon: Repeat, title: "Bill every month automatically", module: "sales", guide: "recurring-invoices",
    summary: "Recurring invoices for rent, fees, retainers and contracts, with reminders for late payers.",
    problem: "The same invoices typed every month, sent late, and followed up by phone.",
    steps: [
      { title: "Set it up once", text: "The customer, the lines and how often." },
      { title: "It goes out", text: "Invoices are raised and emailed on the date." },
      { title: "Follow up", text: "Reminders go to anyone overdue, and statements show what is owed." },
    ],
    outcomes: ["Invoices out on time, every time", "Fewer late payments", "Hours back every month"],
  },
  {
    slug: "control-spending", icon: ShieldCheck, title: "Control spending", module: "control", guide: "approvals",
    summary: "Approval chains, budgets against actual, cost centres and a fixed asset register.",
    problem: "Money leaves before anyone senior has seen it, and budgets live in a spreadsheet.",
    steps: [
      { title: "Set approval chains", text: "Orders, vouchers and payroll go up the chain before they count." },
      { title: "Set budgets", text: "Per account, cost centre or project." },
      { title: "Compare", text: "Budget against actual, any time." },
      { title: "Register assets", text: "Vehicles, computers and machinery, depreciated every month." },
    ],
    outcomes: ["No spending without sign-off", "Budget overruns seen early", "An asset register your auditor will like"],
  },
  {
    slug: "consolidate-a-group", icon: Network, title: "Report on a group of companies", module: "company_groups", guide: "company-groups",
    summary: "Internal sales and loans recorded once, and consolidated reports with them taken out.",
    problem: "Several companies, several logins, and group accounts put together by hand.",
    steps: [
      { title: "Form the group", text: "Put your businesses in one group." },
      { title: "Record internal deals", text: "Sales, loans and repayments between companies are posted on both sides." },
      { title: "Consolidate", text: "Group profit and loss and balance sheet with internal amounts taken out." },
    ],
    outcomes: ["One sign-in for every company", "Group accounts in a click", "Balances between companies that always agree"],
  },
  {
    slug: "sell-online", icon: Globe, title: "Sell online", module: "store", guide: "online-shop",
    summary: "Your own shop page: customers order, pay by M-Pesa, and orders become sales.",
    problem: "Orders by WhatsApp and phone, tracked on paper, with payments to chase.",
    steps: [
      { title: "Switch on your shop", text: "Choose the products to show, pickup or delivery, and a delivery fee." },
      { title: "Share the link", text: "Customers order from their phones and pay by M-Pesa or on delivery." },
      { title: "Fulfil", text: "Confirm, mark ready and complete; completed orders become cash sales." },
    ],
    outcomes: ["Orders in one list, not in chats", "Paid before you deliver", "Stock and books updated with every order"],
  },
  {
    slug: "win-more-deals", icon: Handshake, title: "Win more deals", module: "crm", guide: "crm",
    summary: "Leads, a deal pipeline and follow-up tasks, connected to your quotations.",
    problem: "Leads in notebooks and follow-ups that never happen.",
    steps: [
      { title: "Capture leads", text: "Record each enquiry and where it came from." },
      { title: "Work the pipeline", text: "Move deals through stages and see the value at each." },
      { title: "Follow up", text: "Tasks and calls with due dates, so nothing is forgotten." },
      { title: "Quote and win", text: "When the quotation from a deal is accepted, the deal is won." },
    ],
    outcomes: ["Every lead followed up", "A pipeline you can forecast from", "Sales and accounting in one system"],
  },
  {
    slug: "vat-and-kra", icon: BadgePercent, title: "Stay right with KRA", module: "sales", guide: "tax-rates",
    summary: "VAT on every document, withholding tax on payments, and the VAT summary for your return.",
    problem: "VAT worked out at the end of the month from piles of receipts.",
    steps: [
      { title: "Set your tax details", text: "Your KRA PIN and VAT status; documents show them." },
      { title: "Trade normally", text: "VAT is worked out on every sale and purchase, and withholding tax kept back when you pay suppliers." },
      { title: "File", text: "The VAT summary gives the figures for your return, due by the 20th." },
    ],
    outcomes: ["VAT ready for iTax each month", "Withholding tax recorded for remittance", "KRA eTIMS signing once KRA approves MannaBooks"],
  },
];

export function findUseCase(slug: string) {
  return USE_CASES.find((u) => u.slug === slug);
}

export function industriesFor(useCase: string) {
  return INDUSTRIES.filter((i) => i.useCases.includes(useCase));
}
