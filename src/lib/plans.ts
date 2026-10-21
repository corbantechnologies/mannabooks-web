/**
 * The plans as seeded in the API (subscriptions migration 0002). The pricing page shows the API's plans, so prices
 * changed in the MannaBooks admin win; this copy is what the public pages fall back on when the API can't be reached.
 */
export type PublicPlan = {
  key: string; name: string; description: string; price_monthly: string; price_yearly: string; modules: unknown; features: unknown;
  max_users: number | null; max_documents_month: number | null; payroll_per_employee: string; payroll_minimum: string; is_free: boolean;
};

export const MODULE_LABEL: Record<string, string> = {
  sales: "Quotations, invoices, cash sales, M-Pesa", pos: "Till with shifts and loyalty", store: "Online shop", purchasing: "LPOs, bills and suppliers",
  inventory: "Stock and warehouses", manufacturing: "Recipes and production", banking: "Bank, M-Pesa and expenses", people: "Payroll and leave",
  projects: "Projects and job costing", crm: "CRM: leads and deals", control: "Budgets, approvals, fixed assets",
};

const ALL = ["sales", "pos", "store", "purchasing", "inventory", "manufacturing", "banking", "people", "projects", "crm", "control"];

export const FALLBACK_PLANS: PublicPlan[] = [
  { key: "free", name: "Free", description: "Invoices, cash sales and M-Pesa for one person starting out.", price_monthly: "0.00", price_yearly: "0.00",
    modules: ["sales", "banking"], features: [], max_users: 1, max_documents_month: 30, payroll_per_employee: "0", payroll_minimum: "0", is_free: true },
  { key: "biashara", name: "Biashara", description: "Service businesses: sales, banking, VAT, CRM and payroll.", price_monthly: "1500.00", price_yearly: "15000.00",
    modules: ["sales", "banking", "crm", "people", "projects"], features: ["business_inbox"], max_users: 3, max_documents_month: null,
    payroll_per_employee: "100", payroll_minimum: "500", is_free: false },
  { key: "duka", name: "Duka", description: "Shops, restaurants and stores: the till, stock, buying, recipes and an online shop.", price_monthly: "3500.00",
    price_yearly: "35000.00", modules: ["sales", "pos", "store", "purchasing", "inventory", "manufacturing", "banking", "crm", "people", "projects"],
    features: ["business_inbox"], max_users: 5, max_documents_month: null, payroll_per_employee: "100", payroll_minimum: "500", is_free: false },
  { key: "kampuni", name: "Kampuni", description: "Growing and multi-branch firms: everything, with budgets, approvals, assets and company groups.",
    price_monthly: "8000.00", price_yearly: "80000.00", modules: ALL, features: ["business_inbox", "company_groups"], max_users: 15,
    max_documents_month: null, payroll_per_employee: "100", payroll_minimum: "500", is_free: false },
];

export function planOf(key: string): PublicPlan {
  return FALLBACK_PLANS.find((p) => p.key === key) ?? FALLBACK_PLANS[FALLBACK_PLANS.length - 1];
}

/** Paid plans that include a module (or, for "company_groups", the feature). */
export function plansWith(module: string): PublicPlan[] {
  return FALLBACK_PLANS.filter((p) => (p.modules as string[]).includes(module) || (p.features as string[]).includes(module));
}

export function shillings(amount: string | number): string {
  return `KES ${Number(amount).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}
