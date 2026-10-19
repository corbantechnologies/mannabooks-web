"use client";

import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "./client";
import type { LedgerAccount } from "./types";

export const ACCOUNT_TYPES = [
  { value: "asset", label: "Assets" },
  { value: "liability", label: "Liabilities" },
  { value: "equity", label: "Equity" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expenses" },
] as const;

export const SUBTYPES: Record<string, { value: string; label: string }[]> = {
  asset: [
    { value: "cash", label: "Cash" },
    { value: "bank", label: "Bank and mobile money" },
    { value: "receivable", label: "Accounts receivable" },
    { value: "inventory", label: "Inventory" },
    { value: "current_asset", label: "Other current asset" },
    { value: "fixed_asset", label: "Fixed asset" },
    { value: "tax_asset", label: "Tax recoverable" },
  ],
  liability: [
    { value: "payable", label: "Accounts payable" },
    { value: "tax_liability", label: "Tax payable" },
    { value: "current_liability", label: "Other current liability" },
    { value: "long_term_liability", label: "Long-term liability" },
  ],
  equity: [{ value: "equity", label: "Equity" }],
  income: [
    { value: "income", label: "Operating income" },
    { value: "other_income", label: "Other income" },
  ],
  expense: [
    { value: "cost_of_sales", label: "Cost of sales" },
    { value: "expense", label: "Operating expense" },
    { value: "other_expense", label: "Other expense" },
  ],
};

export function useAccounts(slug: string, asOf?: string) {
  return useQuery({
    queryKey: ["ledger-accounts", slug, asOf ?? ""],
    queryFn: async () =>
      unwrap(
        await api.GET("/api/v1/w/{workspace}/ledger-accounts/", {
          params: { path: { workspace: slug }, query: { as_of: asOf || undefined } },
        }),
      ),
  });
}

export function AccountOptions({ accounts, activeOnly = true }: { accounts: LedgerAccount[]; activeOnly?: boolean }) {
  return (
    <>
      {ACCOUNT_TYPES.map((t) => (
        <optgroup key={t.value} label={t.label}>
          {accounts
            .filter((a) => a.account_type === t.value && (!activeOnly || a.is_active))
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} {a.name}
              </option>
            ))}
        </optgroup>
      ))}
    </>
  );
}
