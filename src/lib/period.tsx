"use client";

import { createContext, useContext, useState } from "react";

import type { WorkspaceContext } from "@/lib/api/types";
import { todayIso } from "@/lib/format";

/**
 * The financial year (and optionally one month) the user is working in, like being inside one workspace:
 * lists, reports and the dashboard follow it. Remembered per workspace on this device.
 */
export interface FiscalYearBrief { id: string; name: string; start_date: string; end_date: string; status: "open" | "closed" }

export interface Period {
  yearId: string | null; // null: all years
  month: string; // "" for the whole year, else "YYYY-MM"
}

export interface PeriodState {
  period: Period;
  setPeriod: (p: Period) => void;
  years: FiscalYearBrief[];
  year: FiscalYearBrief | null;
  /** Date range of the period; both undefined for "All years". */
  from?: string;
  to?: string;
  label: string;
  /** The months of the chosen year, as "YYYY-MM". */
  months: string[];
}

const Ctx = createContext<PeriodState | null>(null);
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthName(ym: string, long = false): string {
  const d = new Date(`${ym}-01T00:00:00`);
  return long ? d.toLocaleDateString("en-KE", { month: "long", year: "numeric" }) : `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function monthsOf(start: string, end: string): string[] {
  const out: string[] = [];
  let y = Number(start.slice(0, 4)), m = Number(start.slice(5, 7));
  const last = end.slice(0, 7);
  for (let i = 0; i < 24; i += 1) {
    const ym = `${y}-${String(m).padStart(2, "0")}`;
    out.push(ym);
    if (ym === last) break;
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

function lastDay(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
}

function storageKey(slug: string) {
  return `mannabooks.period.${slug}`;
}

export function PeriodProvider({ slug, context, children }: { slug: string; context: WorkspaceContext; children: React.ReactNode }) {
  const years = (context.fiscal_years ?? []) as unknown as FiscalYearBrief[];
  const today = todayIso();
  const current = years.find((y) => y.start_date <= today && today <= y.end_date) ?? years[0] ?? null;
  // The layout mounts this only in the browser, once the workspace has loaded, so reading storage here is safe.
  const [period, setPeriodState] = useState<Period>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(slug)) ?? "null") as Period | null;
      if (saved && (saved.yearId === null || years.some((y) => y.id === saved.yearId))) return saved;
    } catch {
      // private window or blocked storage: start on the current year
    }
    return { yearId: current?.id ?? null, month: "" };
  });

  const setPeriod = (p: Period) => {
    setPeriodState(p);
    try {
      localStorage.setItem(storageKey(slug), JSON.stringify(p));
    } catch {
      // not remembered, still applied
    }
  };

  const year = years.find((y) => y.id === period.yearId) ?? null;
  const months = year ? monthsOf(year.start_date, year.end_date) : [];
  const month = period.month && months.includes(period.month) ? period.month : "";
  const from = year ? (month ? `${month}-01` : year.start_date) : undefined;
  const to = year ? (month ? lastDay(month) : year.end_date) : undefined;
  const label = !year ? "All years" : month ? monthName(month, true) : year.name;
  return <Ctx.Provider value={{ period: { yearId: period.yearId, month }, setPeriod, years, year, from, to, label, months }}>{children}</Ctx.Provider>;
}

export function usePeriod(): PeriodState {
  const value = useContext(Ctx);
  if (!value) throw new Error("usePeriod must be used inside a workspace page.");
  return value;
}

/** Query params that keep a list to the chosen period: `dateQuery("issue_date")` -> {issue_date__gte, issue_date__lte}. */
export function useDateQuery(field: string): Record<string, string | undefined> {
  const { from, to } = usePeriod();
  return { [`${field}__gte`]: from, [`${field}__lte`]: to };
}
