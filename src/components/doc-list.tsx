"use client";

import { Search } from "lucide-react";

import { Input, Select } from "./ui";

export function ListFilters({ search, setSearch, status, setStatus, statuses, placeholder = "Search number or customer" }: {
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
    </div>
  );
}
