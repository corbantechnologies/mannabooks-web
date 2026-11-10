"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

import { Button, Card, FormError, Input } from "./ui";

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const MON_TO_FRI = [0, 1, 2, 3, 4];

/** Seven toggles, Monday first; days are 0 (Monday) to 6 (Sunday). */
export function DayPicker({ value, onChange, disabled }: { value: number[]; onChange: (days: number[]) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Working days">
      {DAYS.map((d, i) => {
        const on = value.includes(i);
        return (
          <button key={d} type="button" disabled={disabled} aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== i) : [...value, i].sort())}
            className={`min-w-12 rounded-md border px-2.5 py-1.5 text-sm font-medium disabled:opacity-50 ${on ? "border-brand-600 bg-brand-50 text-brand-800" : "border-stone-300 bg-white text-stone-500 hover:bg-stone-50"}`}>
            {d}
          </button>
        );
      })}
    </div>
  );
}

// Kenya's fixed-date public holidays; Good Friday, Easter Monday and Idd-ul-Fitr move each year and are added as gazetted.
const KENYA_FIXED = [["01-01", "New Year's Day"], ["05-01", "Labour Day"], ["06-01", "Madaraka Day"], ["10-10", "Mazingira Day"],
  ["10-20", "Mashujaa Day"], ["12-12", "Jamhuri Day"], ["12-25", "Christmas Day"], ["12-26", "Boxing Day"]] as const;

type Holiday = { date: string; name: string };

/** Settings: the company's working week and public holidays. Leave days, payroll and due dates count from these. */
export function WorkingWeekCard() {
  const { slug, context } = useWorkspace();
  const ws = context.workspace;
  const [days, setDays] = useState<number[]>((ws.working_days as number[] | null) ?? MON_TO_FRI);
  const [holidays, setHolidays] = useState<Holiday[]>((ws.public_holidays as Holiday[] | null) ?? []);
  const [draft, setDraft] = useState<Holiday>({ date: "", name: "" });
  const year = new Date().getFullYear();
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PATCH("/api/v1/w/{workspace}/", {
      params: { path: { workspace: slug } }, body: { working_days: days, public_holidays: holidays } as never,
    })),
    onSuccess: () => toast.success("Working week saved"),
  });
  const add = (h: Holiday[]) => setHolidays((cur) => {
    const byDate = new Map(cur.map((x) => [x.date, x]));
    h.forEach((x) => { if (!byDate.has(x.date)) byDate.set(x.date, x); });
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  });
  const upcoming = holidays.filter((h) => h.date >= `${year}-01-01`);
  return (
    <Card className="space-y-5 p-5">
      <div>
        <h2 className="font-semibold">Working week and public holidays</h2>
        <p className="mt-1 text-sm text-stone-600">Leave is counted in working days, and a day of unpaid leave is worth a share of the month&apos;s working days. Someone with a different pattern gets their own days on their staff record.</p>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-stone-700">The company works on</p>
        <DayPicker value={days} onChange={setDays} />
        {days.length === 0 && <p className="text-xs text-red-600">Choose at least one day.</p>}
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-stone-700">Public holidays ({upcoming.length} from {year})</p>
          <Button type="button" variant="ghost" className="px-2 py-1"
            onClick={() => add([year, year + 1].flatMap((y) => KENYA_FIXED.map(([md, name]) => ({ date: `${y}-${md}`, name }))))}>
            <Plus className="h-4 w-4" /> Kenya&apos;s fixed holidays, {year} and {year + 1}
          </Button>
        </div>
        <ul className="max-h-60 divide-y divide-stone-100 overflow-y-auto rounded-md border border-stone-200">
          {upcoming.length === 0 && <li className="px-3 py-3 text-sm text-stone-500">None yet.</li>}
          {upcoming.map((h) => (
            <li key={h.date} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="w-32 shrink-0 text-stone-600">{fmtDate(h.date)}</span>
              <span className="min-w-0 flex-1 truncate">{h.name}</span>
              <button type="button" aria-label={`Remove ${h.name}`} className="text-stone-400 hover:text-red-600" onClick={() => setHolidays((cur) => cur.filter((x) => x.date !== h.date))}><X className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (draft.date) { add([{ date: draft.date, name: draft.name.trim() || "Public holiday" }]); setDraft({ date: "", name: "" }); } }}>
          <Input type="date" className="w-44" value={draft.date} onChange={(e) => setDraft((p) => ({ ...p, date: e.target.value }))} aria-label="Holiday date" />
          <Input className="min-w-0 flex-1" value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Good Friday" aria-label="Holiday name" />
          <Button type="submit" variant="secondary" disabled={!draft.date}>Add</Button>
        </form>
        <p className="text-xs text-stone-500">Add Good Friday, Easter Monday, Idd-ul-Fitr and any special holidays each year as they are gazetted. Check the fixed ones against the gazette too.</p>
      </div>
      <FormError error={save.error} />
      <div className="flex justify-end"><Button disabled={days.length === 0} loading={save.isPending} onClick={() => save.mutate()}>Save</Button></div>
    </Card>
  );
}
