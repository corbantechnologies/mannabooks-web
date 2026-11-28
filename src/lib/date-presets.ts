/** Date ranges people pick most: this month (the usual default), last month, this year, everything. */
export type Preset = "this_month" | "last_month" | "3_months" | "this_year" | "all" | "custom";

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export function presetRange(name: Preset): [string, string] {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  if (name === "this_month") return [iso(new Date(y, m, 1)), iso(new Date(y, m + 1, 0))];
  if (name === "last_month") return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))];
  if (name === "3_months") return [iso(new Date(y, m - 2, 1)), iso(new Date(y, m + 1, 0))];
  if (name === "this_year") return [iso(new Date(y, 0, 1)), iso(new Date(y, 11, 31))];
  return ["", ""];
}

export const PRESETS: [Preset, string][] = [
  ["this_month", "This month"], ["last_month", "Last month"], ["3_months", "Last 3 months"], ["this_year", "This year"], ["all", "Everything"], ["custom", "Choose dates"],
];
