"use client";

import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "./client";

export type OwnerKind = "capital" | "shares" | "loan_in" | "loan_in_repaid" | "loan_out" | "loan_out_repaid" | "drawings" | "opening";

/** What money can pass between the business and an owner or director, and which way it goes. */
export const OWNER_KINDS: { value: Exclude<OwnerKind, "opening">; label: string; in: boolean; hint: string }[] = [
  { value: "capital", label: "Capital put in", in: true, hint: "An owner or partner puts money in for good (Owner's capital)." },
  { value: "shares", label: "Shares issued", in: true, hint: "A shareholder pays for new shares (Share capital, and Share premium above face value)." },
  { value: "loan_in", label: "Lent to the business", in: true, hint: "They lend the business money it will pay back (Directors' loan accounts)." },
  { value: "loan_in_repaid", label: "Loan repaid to them", in: false, hint: "The business pays back part of what they lent it." },
  { value: "loan_out", label: "Lent to them by the business", in: false, hint: "The business lends them money (Loans to directors)." },
  { value: "loan_out_repaid", label: "Loan repaid by them", in: true, hint: "They pay back part of what the business lent them." },
  { value: "drawings", label: "Drawings", in: false, hint: "An owner takes money out for themselves (Drawings)." },
];

export const OWNER_BALANCES = [
  { value: "capital", label: "Capital put in" },
  { value: "shares", label: "Shares (paid for shares)" },
  { value: "owed_to", label: "Owed to them (they lent the business)" },
  { value: "owed_by", label: "Owed by them (the business lent them)" },
  { value: "drawings", label: "Drawings" },
] as const;

export const OWNER_ROLES = [
  { value: "director", label: "Director" }, { value: "shareholder", label: "Shareholder" }, { value: "owner", label: "Owner" }, { value: "partner", label: "Partner" },
] as const;

export function useOwners(slug: string) {
  return useQuery({
    queryKey: ["owners", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/owners/", { params: { path: { workspace: slug }, query: { page_size: 200 } as never } })),
  });
}
