"use client";

import { Search } from "lucide-react";

import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { usePeriod } from "@/lib/period";
import { useWorkspace } from "@/lib/workspace";

import { Input, Select } from "./ui";

export function ListFilters({ search, setSearch, status, setStatus, statuses, placeholder = "Search number or customer", dated = false, count }: {
  /** The list follows the period in the top bar: say so, with a way out, so older documents never look missing. */
  dated?: boolean;
  /** The same list without the dates, to say how many are outside the period. */
  count?: OutsideCount;
  search: string;
  setSearch: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  statuses: [string, string][];
  placeholder?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Select className="max-w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All</option>
        {statuses.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select>
      <div className="relative max-w-sm flex-1">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
        <Input className="pl-9" placeholder={placeholder} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {dated && <PeriodShown count={count} />}
    </div>
  );
}

export type OutsideCount = { path: string; query: Record<string, unknown>; shown?: number };

/**
 * "Dated in FY2026/27 (1 Jul 2026 to 30 Jun 2027) · 12 more outside it · Show all years", on lists that follow the top
 * bar's period, so a list can never silently hide documents dated in another year.
 */
export function PeriodShown({ count }: { count?: OutsideCount }) {
  const { slug } = useWorkspace();
  const { period, setPeriod, label, from, to } = usePeriod();
  const all = useQuery({
    queryKey: ["period-outside", slug, count?.path, count?.query],
    enabled: Boolean(count && period.yearId),
    queryFn: async () => {
      const res = await api.GET(count!.path as never, { params: { path: { workspace: slug }, query: { ...count!.query, page_size: 1 } } } as never);
      return unwrap(res as never) as { count: number };
    },
  });
  if (!period.yearId) return <p className="flex items-center text-xs text-stone-500">Showing all dates</p>;
  const outside = all.data && count?.shown != null ? Math.max(all.data.count - count.shown, 0) : 0;
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-xs text-stone-500">
      <span>Dated in {label}{from && to ? ` (${fmtDate(from)} to ${fmtDate(to)})` : ""}</span>
      {outside > 0 && <span className="font-medium text-amber-700">{outside} more dated outside it</span>}
      <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => setPeriod({ yearId: null, month: "" })}>Show all years</button>
    </p>
  );
}
