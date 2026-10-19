"use client";

export interface PayItem { name: string; kind: "earning" | "deduction"; amount: string | number; taxable?: boolean }

export const LEAVE_TYPES = [
  { value: "annual", label: "Annual leave" }, { value: "sick", label: "Sick leave" }, { value: "maternity", label: "Maternity leave" },
  { value: "paternity", label: "Paternity leave" }, { value: "compassionate", label: "Compassionate leave" }, { value: "study", label: "Study leave" },
  { value: "unpaid", label: "Unpaid leave" },
] as const;

type Tone = "stone" | "green" | "amber" | "red" | "blue";
export const LEAVE_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Waiting for approval", tone: "amber" }, approved: { label: "Approved", tone: "green" },
  rejected: { label: "Declined", tone: "red" }, cancelled: { label: "Cancelled", tone: "stone" },
};
export const RUN_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "amber" }, approved: { label: "Approved", tone: "blue" }, paid: { label: "Paid", tone: "green" },
};
export const REMITTANCES = [
  { kind: "paye", label: "PAYE", to: "KRA (iTax), by the 9th", total: "total_paye" },
  { kind: "shif", label: "SHIF", to: "SHA, by the 9th", total: "total_shif" },
  { kind: "nssf", label: "NSSF", to: "NSSF, by the 9th", total: "total_nssf" },
  { kind: "housing_levy", label: "Housing Levy", to: "KRA (iTax), by the 9th working day", total: "total_housing_levy" },
] as const;
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
