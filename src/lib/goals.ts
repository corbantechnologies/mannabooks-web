import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type GoalRow = S["GoalRow"];
export type GoalDetail = S["GoalDetail"];

export const MEASURES: { value: string; label: string; hint: string; money?: boolean; person?: boolean }[] = [
  { value: "revenue", label: "Revenue", hint: "Sales before VAT, from the books", money: true },
  { value: "profit", label: "Net profit", hint: "From the profit and loss", money: true },
  { value: "costs", label: "Costs", hint: "Cost of sales and expenses. Usually a limit: at most", money: true },
  { value: "cash_collected", label: "Cash collected", hint: "Customer payments and cash sales", money: true },
  { value: "new_customers", label: "New customers", hint: "Customers added in the period" },
  { value: "deals_won", label: "Deals won", hint: "Deals marked won in the period", person: true },
  { value: "invoices_issued", label: "Invoices issued", hint: "Invoices issued in the period", person: true },
  { value: "tasks_on_time", label: "Tasks done on time (%)", hint: "Share of finished tasks done by their deadline", person: true },
  { value: "milestones", label: "Milestones", hint: "A checklist: reached when every step is ticked", person: true },
  { value: "manual", label: "A number you update", hint: "Anything else: check in with the new figure", person: true },
];

export const STATUS_TONE: Record<string, "green" | "amber" | "red" | "stone" | "blue"> = {
  on_track: "green", at_risk: "amber", behind: "red", not_started: "stone", achieved: "green", missed: "red", dropped: "stone",
};

export const BAR: Record<string, string> = {
  on_track: "bg-emerald-500", at_risk: "bg-amber-500", behind: "bg-red-500", not_started: "bg-stone-300", achieved: "bg-emerald-600",
  missed: "bg-red-400", dropped: "bg-stone-300",
};

/** "KES 30,000 of 120,000", "4 of 10 clients", "3 of 5 steps"; just the percent when the money is hidden. */
export function figures(g: GoalRow, fmt: (v: string | number) => string): string {
  if (g.value == null || g.target == null) return `${Number(g.percent).toFixed(0)}% of the target`;
  if (g.measure === "milestones") return `${Number(g.value).toFixed(0)}% of the steps done`;
  if (g.measure === "tasks_on_time") return `${Number(g.value).toFixed(0)}% on time (target ${Number(g.target).toFixed(0)}%)`;
  const n = (v: string) => (g.money ? fmt(v) : Number(v).toLocaleString("en-KE"));
  const limit = g.direction === "at_most" ? "limit " : "";
  return `${n(g.value)} of ${limit}${n(g.target)}${g.unit ? ` ${g.unit}` : ""}`;
}
