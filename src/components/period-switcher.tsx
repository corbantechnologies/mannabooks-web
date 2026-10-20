"use client";

import { CalendarDays } from "lucide-react";

import { monthName, usePeriod } from "@/lib/period";

/** Header control: the financial year (and month) everything on screen follows. */
export function PeriodSwitcher() {
  const { period, setPeriod, years, months } = usePeriod();
  if (!years.length) return null;
  const select = "rounded-md border border-stone-200 bg-white py-1 pl-2 pr-7 text-sm text-stone-700 hover:bg-stone-50 focus:border-brand-600 focus:outline-none";
  return (
    <div className="flex items-center gap-1.5" title="The period lists, reports and the dashboard show">
      <CalendarDays className="hidden h-4 w-4 text-stone-400 sm:block" aria-hidden />
      <select aria-label="Financial year" className={select} value={period.yearId ?? "all"}
        onChange={(e) => setPeriod({ yearId: e.target.value === "all" ? null : e.target.value, month: "" })}>
        {years.map((y) => <option key={y.id} value={y.id}>{y.name}{y.status === "closed" ? " (closed)" : ""}</option>)}
        <option value="all">All years</option>
      </select>
      {period.yearId && (
        <select aria-label="Month" className={`${select} hidden sm:block`} value={period.month} onChange={(e) => setPeriod({ ...period, month: e.target.value })}>
          <option value="">Whole year</option>
          {months.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
        </select>
      )}
    </div>
  );
}
