"use client";

import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "./client";

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

/**
 * People to pick as a head or supervisor: staff records, then team members who have no staff record yet
 * (such as the owner). A member's value is "m:<membership id>"; the API makes their staff record on save.
 */
export function usePeoplePicker(slug: string, enabled = true) {
  const staff = useQuery({
    queryKey: ["employees", slug, "picker"], enabled,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/employees/", { params: { path: { workspace: slug }, query: { page_size: 200 } } })),
  });
  const members = useQuery({
    queryKey: ["members", slug, "picker"], enabled, retry: false,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/members/", { params: { path: { workspace: slug }, query: { page_size: 200 } } as never })),
  });
  const employees = (staff.data?.results ?? []).map((e) => ({ value: e.id, label: `${e.full_name} (${e.staff_number})` }));
  const loose = (members.data?.results ?? []).filter((m) => !m.employee_id && m.status === "active")
    .map((m) => ({ value: `m:${m.id}`, label: `${m.user.full_name} (${m.role_name}, no staff record yet)` }));
  return { employees, members: loose };
}

/** Turn a picker value into the API field: an employee id, or a membership id for a member without a record. */
export function pickedPerson(value: string, employeeField: string, memberField: string): Record<string, string | null> {
  if (value.startsWith("m:")) return { [employeeField]: null, [memberField]: value.slice(2) };
  return { [employeeField]: value || null };
}
