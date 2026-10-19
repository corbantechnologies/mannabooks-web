"use client";

import { useQuery } from "@tanstack/react-query";

import { useAccounts } from "./accounting";
import { api, unwrap } from "./client";

export function useSuppliers(slug: string) {
  return useQuery({
    queryKey: ["suppliers", slug, "active"],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/suppliers/", { params: { path: { workspace: slug }, query: { is_active: true, page_size: 200 } } })),
  });
}

export function useWarehouses(slug: string) {
  return useQuery({
    queryKey: ["warehouses", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/warehouses/", { params: { path: { workspace: slug }, query: { page_size: 100 } } })),
  });
}

export function useStockProducts(slug: string) {
  return useQuery({
    queryKey: ["products", slug, "tracked"],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/products/", { params: { path: { workspace: slug }, query: { track_inventory: true, is_active: true, page_size: 200 } } })),
  });
}

/** Expense and asset accounts a purchase line can be charged to. */
export function usePurchaseAccounts(slug: string) {
  const accounts = useAccounts(slug);
  return { ...accounts, data: (accounts.data ?? []).filter((a) => a.is_active && (a.account_type === "expense" || a.account_type === "asset")) };
}

/** Cash, bank and M-Pesa accounts a supplier can be paid from. */
export function usePayingAccounts(slug: string) {
  const accounts = useAccounts(slug);
  return { ...accounts, data: (accounts.data ?? []).filter((a) => a.is_active && (a.subtype === "cash" || a.subtype === "bank")) };
}

type Tone = "stone" | "green" | "amber" | "red" | "blue";
const S = (label: string, tone: Tone) => ({ label, tone });

export const PO_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: S("Draft", "amber"), approved: S("Approved", "blue"), partially_received: S("Partly received", "amber"),
  received: S("Received", "green"), closed: S("Closed", "stone"), cancelled: S("Cancelled", "stone"),
};
export const SO_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: S("Draft", "amber"), approved: S("Approved", "blue"), completed: S("Completed", "green"), cancelled: S("Cancelled", "stone"),
};
export const BILL_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: S("Draft", "amber"), posted: S("Unpaid", "blue"), partially_paid: S("Partly paid", "amber"), paid: S("Paid", "green"), void: S("Void", "stone"),
};
export const PV_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: S("Awaiting approval", "amber"), approved: S("Approved", "blue"), paid: S("Paid", "green"), cancelled: S("Cancelled", "stone"),
};
export const POSTED_STATUS: Record<string, { label: string; tone: Tone }> = { posted: S("Posted", "green"), void: S("Void", "stone") };
export const TAKE_STATUS: Record<string, { label: string; tone: Tone }> = {
  counting: S("Counting", "amber"), posted: S("Posted", "green"), cancelled: S("Cancelled", "stone"),
};
export const MO_STATUS: Record<string, { label: string; tone: Tone }> = {
  planned: S("Planned", "amber"), completed: S("Completed", "green"), cancelled: S("Cancelled", "stone"),
};
export const PAY_METHODS = [
  { value: "bank", label: "Bank transfer" }, { value: "mpesa", label: "M-Pesa" }, { value: "cheque", label: "Cheque" }, { value: "cash", label: "Cash" },
] as const;
export const ADJUST_REASONS = [
  { value: "opening", label: "Opening stock" }, { value: "damaged", label: "Damaged" }, { value: "expired", label: "Expired" },
  { value: "theft", label: "Lost or stolen" }, { value: "found", label: "Found" }, { value: "own_use", label: "Used by the business" },
  { value: "correction", label: "Correction" },
] as const;
