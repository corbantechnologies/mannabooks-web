"use client";

import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "./client";
import type { components } from "./schema";

type S = components["schemas"];
export type CostCenter = S["CostCenter"];
export type Project = S["Project"];
export type ProjectSummary = S["ProjectSummary"];
export type Budget = S["Budget"];
export type BudgetVersusActual = S["BudgetVersusActual"];
export type ApprovalRule = S["ApprovalRule"];
export type ApprovalRequest = S["ApprovalRequest"];
export type ApprovalStatus = S["ApprovalStatus"];
export type ReportSection = S["ReportSection"];

type Tone = "stone" | "green" | "amber" | "red" | "blue";
export type DocType = "purchase_order" | "service_order" | "payment_voucher" | "pay_run" | "budget";

export const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: "purchase_order", label: "Purchase orders" }, { value: "service_order", label: "Service orders" },
  { value: "payment_voucher", label: "Payment vouchers" }, { value: "pay_run", label: "Payroll" }, { value: "budget", label: "Budgets" },
];
export const LEVEL_KINDS = [
  { value: "supervisor", label: "Their supervisor", hint: "Whoever the person who prepared it reports to." },
  { value: "department_head", label: "Their department head", hint: "The head of the preparer's department." },
  { value: "module_in_charge", label: "The module in-charge", hint: "The head of the department that runs purchasing, finance or HR." },
  { value: "role", label: "Anyone with a role", hint: "Any one person with the role can approve." },
  { value: "member", label: "A named person", hint: "One particular team member." },
  { value: "owner", label: "The owner", hint: "The workspace owner." },
] as const;
export const PROJECT_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "green" }, on_hold: { label: "On hold", tone: "amber" },
  completed: { label: "Completed", tone: "blue" }, cancelled: { label: "Cancelled", tone: "stone" },
};
export const BUDGET_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "amber" }, approved: { label: "Approved", tone: "green" },
};
export const APPROVAL_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Waiting", tone: "amber" }, approved: { label: "Approved", tone: "green" },
  rejected: { label: "Not approved", tone: "red" }, cancelled: { label: "Withdrawn", tone: "stone" },
};

export function useCostCenters(slug: string) {
  return useQuery({
    queryKey: ["cost-centers", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/cost-centers/", { params: { path: { workspace: slug } } })),
  });
}

export function useProjects(slug: string) {
  return useQuery({
    queryKey: ["projects", slug, "all"],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/projects/", { params: { path: { workspace: slug }, query: { page_size: 200 } } })),
  });
}

export function useFiscalYears(slug: string) {
  return useQuery({
    queryKey: ["fiscal-years", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/fiscal-years/", { params: { path: { workspace: slug } } })),
  });
}

export function useApprovalStatus(slug: string, docType: DocType, id: string) {
  return useQuery({
    queryKey: ["approval-status", slug, docType, id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/approvals/status/", {
      params: { path: { workspace: slug }, query: { document_type: docType, object_id: id } },
    })),
    enabled: Boolean(id),
  });
}

const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-07-01" -> "Jul 26" */
export function monthLabel(iso: string): string {
  return `${SHORT[Number(iso.slice(5, 7)) - 1]} ${iso.slice(2, 4)}`;
}

function iso(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/** Date ranges people pick for reports. */
export function datePresets(): { key: string; label: string; from: string; to: string }[] {
  const t = new Date();
  const y = t.getFullYear(), m = t.getMonth();
  const q = Math.floor(m / 3) * 3;
  return [
    { key: "this_month", label: "This month", from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) },
    { key: "last_month", label: "Last month", from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) },
    { key: "this_quarter", label: "This quarter", from: iso(new Date(y, q, 1)), to: iso(new Date(y, q + 3, 0)) },
    { key: "last_quarter", label: "Last quarter", from: iso(new Date(y, q - 3, 1)), to: iso(new Date(y, q, 0)) },
    { key: "this_year", label: "This year", from: iso(new Date(y, 0, 1)), to: iso(new Date(y, 11, 31)) },
    { key: "last_year", label: "Last year", from: iso(new Date(y - 1, 0, 1)), to: iso(new Date(y - 1, 11, 31)) },
  ];
}
