"use client";

import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "./client";

export function useBankAccounts(slug: string) {
  return useQuery({
    queryKey: ["bank-accounts", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/bank-accounts/", { params: { path: { workspace: slug }, query: { page_size: 100 } } })),
  });
}

export const ACCOUNT_KINDS = [{ value: "bank", label: "Bank account" }, { value: "mobile", label: "M-Pesa / mobile money" }, { value: "cash", label: "Cash" }] as const;

export const LINE_STATUS: Record<string, { label: string; tone: "stone" | "green" | "amber" }> = {
  unmatched: { label: "To match", tone: "amber" }, matched: { label: "Matched", tone: "green" }, excluded: { label: "Ignored", tone: "stone" },
};

/** Read a bank or M-Pesa statement CSV into rows. Handles one amount column, or separate money in / money out columns. */
export interface CsvRow { [column: string]: string }

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const records: string[][] = [];
  let field = "", row: string[] = [], quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((c) => c.trim())) records.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim())) records.push(row);
  // the header is the first row that names a date column (bank exports often start with a few title lines)
  const start = Math.max(0, records.findIndex((r) => r.some((c) => /date|time/i.test(c))));
  const headers = (records[start] ?? []).map((h) => h.trim());
  const rows = records.slice(start + 1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()])));
  return { headers, rows };
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** 2026-10-18, 18/10/2026, 18-10-2026, 18 Oct 2026, 18-Oct-26, "2026-10-18 14:05:11" -> 2026-10-18 */
export function toIsoDate(value: string): string | null {
  const v = value.trim();
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) return `${m[3].length === 2 ? "20" + m[3] : m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = v.match(/^(\d{1,2})[ -]([A-Za-z]{3})[a-z]*[ -](\d{2,4})/);
  if (m) {
    const month = MONTHS.indexOf(m[2].toLowerCase()) + 1;
    if (month) return `${m[3].length === 2 ? "20" + m[3] : m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

export function toAmount(value: string): number {
  const v = (value ?? "").replace(/[,\s]|KES|KSH/gi, "");
  if (!v) return 0;
  const negative = /^\(.*\)$/.test(v) || v.startsWith("-");
  const n = Number(v.replace(/[()\-]/g, ""));
  return Number.isFinite(n) ? (negative ? -n : n) : 0;
}

/** Guess which columns are which (works for M-Pesa statements and most bank exports). */
export function guessColumns(headers: string[]) {
  const find = (re: RegExp) => headers.find((h) => re.test(h)) ?? "";
  return {
    date: find(/date|time/i),
    description: find(/details|description|narration|particulars|transaction/i),
    reference: find(/receipt|ref|cheque/i),
    amount: find(/^amount$/i),
    money_in: find(/paid in|credit|deposit|money in/i),
    money_out: find(/withdrawn|debit|withdrawal|money out|paid out/i),
  };
}
