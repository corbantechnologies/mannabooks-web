"use client";

import { useQuery } from "@tanstack/react-query";

import { useAccounts } from "./accounting";
import { api, unwrap } from "./client";

export function useCustomers(slug: string, search = "") {
  return useQuery({
    queryKey: ["customers", slug, search],
    queryFn: async () =>
      unwrap(await api.GET("/api/v1/w/{workspace}/customers/", {
        params: { path: { workspace: slug }, query: { search: search || undefined, is_active: true, page_size: 200 } },
      })),
  });
}

export function useProducts(slug: string) {
  return useQuery({
    queryKey: ["products", slug, "active"],
    queryFn: async () =>
      unwrap(await api.GET("/api/v1/w/{workspace}/products/", { params: { path: { workspace: slug }, query: { is_active: true, page_size: 200 } } })),
  });
}

export function useVatRates(slug: string) {
  return useQuery({
    queryKey: ["tax-rates", slug, "vat"],
    queryFn: async () =>
      unwrap(await api.GET("/api/v1/w/{workspace}/tax-rates/", { params: { path: { workspace: slug }, query: { kind: "vat", is_active: true } } })),
  });
}

/** Cash, bank and M-Pesa accounts money can be received into. */
export function useDepositAccounts(slug: string) {
  const accounts = useAccounts(slug);
  return { ...accounts, data: (accounts.data ?? []).filter((a) => a.is_active && (a.subtype === "cash" || a.subtype === "bank")) };
}

/** The account money paid by `method` usually lands in: M-Pesa, cash, otherwise the bank. */
export function depositFor(accounts: { id: string; system_key?: string | null }[], method: string): string {
  const want = method === "mpesa" ? "mpesa" : method === "cash" ? "cash" : "bank";
  return accounts.find((a) => a.system_key === want)?.id ?? accounts[0]?.id ?? "";
}

export const METHODS = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
] as const;

export const INVOICE_STATUS = {
  draft: { label: "Draft", tone: "amber" },
  issued: { label: "Issued", tone: "blue" },
  partially_paid: { label: "Partly paid", tone: "amber" },
  paid: { label: "Paid", tone: "green" },
  void: { label: "Void", tone: "stone" },
} as const;

export const QUOTE_STATUS = {
  draft: { label: "Draft", tone: "amber" },
  sent: { label: "Sent", tone: "blue" },
  accepted: { label: "Accepted", tone: "green" },
  declined: { label: "Declined", tone: "red" },
  converted: { label: "Invoiced", tone: "stone" },
} as const;

export const ETIMS_STATUS: Record<string, { label: string; tone: "stone" | "green" | "amber" | "red" | "blue" }> = {
  "": { label: "Not sent to KRA", tone: "stone" },
  disabled: { label: "Not sent (eTIMS off until KRA approval)", tone: "stone" },
  not_configured: { label: "eTIMS not connected", tone: "amber" },
  pending: { label: "Waiting for KRA", tone: "blue" },
  signed: { label: "Signed by KRA", tone: "green" },
  failed: { label: "KRA rejected it", tone: "red" },
};

/** Whether a document's eTIMS status is worth showing: not when it was never sent to KRA. */
export function etimsVisible(status?: string | null): boolean {
  return Boolean(status) && status !== "disabled";
}

export function useCategories(slug: string) {
  return useQuery({
    queryKey: ["product-categories", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/product-categories/", { params: { path: { workspace: slug }, query: { page_size: 200 } } })),
  });
}

export function useUnits(slug: string) {
  return useQuery({
    queryKey: ["units", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/units/", { params: { path: { workspace: slug }, query: { page_size: 200 } } })),
  });
}

export function usePriceLists(slug: string) {
  return useQuery({
    queryKey: ["price-lists", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/price-lists/", { params: { path: { workspace: slug }, query: { page_size: 200 } } })),
  });
}

/** Each product's price for a customer (their price list), keyed by product id. */
export function useCustomerPrices(slug: string, customerId?: string) {
  return useQuery({
    queryKey: ["customer-prices", slug, customerId ?? ""],
    queryFn: async () => {
      const rows = unwrap(await api.GET("/api/v1/w/{workspace}/price-lists/customer-prices/", { params: { path: { workspace: slug }, query: { customer: customerId || undefined } } }));
      return Object.fromEntries(rows.map((r) => [r.product_id, r.price])) as Record<string, string>;
    },
  });
}

/** Invoices that can still be added to, delivered or reminded about. */
export function useOpenInvoices(slug: string, customerId?: string) {
  return useQuery({
    queryKey: ["invoices", slug, "issued", customerId ?? ""],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/invoices/", {
      params: { path: { workspace: slug }, query: { kind: "invoice", customer: customerId || undefined, status__in: ["issued", "partially_paid", "paid"], page_size: 200 } },
      querySerializer: { array: { style: "form", explode: false } },
    })),
  });
}

export const DELIVERY_STATUS = {
  draft: { label: "Draft", tone: "amber" },
  dispatched: { label: "Dispatched", tone: "blue" },
  delivered: { label: "Delivered", tone: "green" },
  void: { label: "Void", tone: "stone" },
} as const;

export const FREQUENCIES = { weekly: "Week", monthly: "Month", quarterly: "3 months", yearly: "Year" } as const;

export const RECURRING_STATUS = {
  active: { label: "Active", tone: "green" },
  paused: { label: "Paused", tone: "amber" },
  ended: { label: "Ended", tone: "stone" },
} as const;

export const MPESA_STATUS = {
  pending: { label: "Waiting", tone: "blue" },
  completed: { label: "Paid", tone: "green" },
  failed: { label: "Failed", tone: "red" },
  cancelled: { label: "Cancelled", tone: "stone" },
} as const;

/** A shift's takings (PosShift.totals). */
export interface ShiftTotals { by_method: { method: string; count: number; total: string }[]; sales_count: number; sales_total: string; expected_cash: string; voided_count: number }
