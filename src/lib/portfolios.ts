import type { components } from "@/lib/api/schema";

type S = components["schemas"];

export type PortfolioDetail = S["PortfolioDetail"];
export type PortfolioService = S["PortfolioServiceOut"];
export type PortfolioApp = S["PortfolioAppOut"];
export type PortfolioResource = S["PortfolioResourceOut"];

export const SERVICE_KINDS = [
  ["core_product", "Core product"], ["retainer", "Maintenance retainer"], ["renewal", "Renewal (domain, SSL)"],
  ["prepaid", "Prepaid managed service"], ["hosting", "Hosting"], ["other", "Other"],
] as const;

export const CYCLES = [["monthly", "Monthly"], ["quarterly", "Every 3 months"], ["half_yearly", "Every 6 months"], ["yearly", "Yearly"], ["one_off", "One-off"]] as const;

export const RESOURCE_KINDS = [["vcpu", "vCPU"], ["ram", "RAM"], ["storage", "Storage"], ["bandwidth", "Bandwidth"], ["backups", "Backups"], ["custom", "Other"]] as const;

export const DOC_KINDS = [["contract", "Contract"], ["agreement", "Agreement"], ["sla", "Service level agreement (SLA)"], ["other", "Other"]] as const;

export const DATE_KIND: Record<string, { label: string; tone: "blue" | "amber" | "stone" | "red" }> = {
  bill_client: { label: "Bill the client", tone: "blue" },
  pay_supplier: { label: "Pay the supplier", tone: "amber" },
  contract_end: { label: "Contract ends", tone: "stone" },
  document_expiry: { label: "Document expires", tone: "red" },
};

/** What the client would pay a month at a given margin: cost / (1 - margin). */
export function fairAt(monthlyCost: number, marginPercent: number): number | null {
  const m = marginPercent / 100;
  return m < 1 ? monthlyCost / (1 - m) : null;
}
