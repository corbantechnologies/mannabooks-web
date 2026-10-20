"use client";

import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "./client";

export const LEAD_STATUS: Record<string, [string, "stone" | "green" | "amber" | "red" | "blue"]> = {
  new: ["New", "blue"], contacted: ["Contacted", "amber"], qualified: ["Qualified", "green"], converted: ["Customer", "green"], lost: ["Lost", "stone"],
};
export const LEAD_SOURCES: [string, string][] = [
  ["walk_in", "Walk-in"], ["call", "Phone call"], ["referral", "Referral"], ["website", "Website"], ["social", "Social media"],
  ["event", "Event or exhibition"], ["other", "Other"],
];
export const STAGES: [string, string][] = [
  ["prospect", "Prospect"], ["qualified", "Qualified"], ["proposal", "Quote sent"], ["negotiation", "Negotiation"], ["won", "Won"], ["lost", "Lost"],
];
export const stageLabel = (s?: string) => STAGES.find(([k]) => k === s)?.[1] ?? s ?? "";
export const ACTIVITY_KINDS: [string, string][] = [["call", "Call"], ["meeting", "Meeting"], ["email", "Email"], ["task", "Task"], ["note", "Note"]];

/** Team members to assign leads, deals and follow-ups to (needs Team view; otherwise the list is empty and items go to you). */
export function useAssignees(slug: string) {
  const members = useQuery({
    queryKey: ["members", slug, "assignees"], retry: false,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/members/", { params: { path: { workspace: slug }, query: { page_size: 200 } } as never })),
  });
  return (members.data?.results ?? []).filter((m) => m.status === "active").map((m) => ({ value: m.id, label: m.user.full_name }));
}

/** Local date-time input value ("2026-10-20T09:00") from an ISO string, and back. */
export const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);
