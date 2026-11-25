"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { GoalCard } from "@/components/goal-card";
import { Button, Card, EmptyState, ErrorState, PageHeader, Select, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace } from "@/lib/workspace";

type Tab = "all" | "company" | "department" | "person" | "mine";

/** Goals: the company's, each department's and each person's, with how far along they are against the time gone. */
export default function GoalsPage() {
  const { slug } = useWorkspace();
  const [tab, setTab] = useState<Tab>("all");
  const [when, setWhen] = useState<"now" | "ended" | "all">("now");
  const q = useQuery({
    queryKey: ["goals", slug, when, tab === "all" || tab === "mine" ? "" : tab, tab === "mine"],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/goals/", {
      params: { path: { workspace: slug }, query: { when, level: tab === "all" || tab === "mine" ? undefined : tab, mine: tab === "mine" || undefined } },
    })),
  });
  const rows = q.data ?? [];
  const tabs: [Tab, string][] = [["all", "All"], ["company", "Company"], ["department", "Departments"], ["person", "People"], ["mine", "Mine"]];
  const groups: [string, string][] = [["company", "Company goals"], ["department", "Department goals"], ["person", "Personal goals"]];
  const counts = { on_track: 0, at_risk: 0, behind: 0 } as Record<string, number>;
  for (const g of rows) if (g.status in counts) counts[g.status] += 1;
  return (
    <div className="w-full">
      <PageHeader title="Goals" guide="goals"
        description="Where the company, each department and each person mean to be by the end of a month, quarter or year. Money goals measure themselves from the books."
        actions={<Link href={`/w/${slug}/goals/new`}><Button><Plus className="h-4 w-4" /> New goal</Button></Link>} />
      <div className="mb-4 flex flex-wrap items-end gap-3 border-b border-stone-200">
        <div className="-mb-px flex gap-1 overflow-x-auto">
          {tabs.map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={clsx("shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm", tab === k ? "border-brand-700 font-medium text-brand-800" : "border-transparent text-stone-500 hover:text-stone-800")}>{label}</button>
          ))}
        </div>
        <div className="ml-auto pb-2">
          <Select aria-label="When" className="w-44" value={when} onChange={(e) => setWhen(e.target.value as typeof when)}>
            <option value="now">Running now and next</option><option value="ended">Ended</option><option value="all">All</option>
          </Select>
        </div>
      </div>
      {when === "now" && rows.length > 0 && (
        <p className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
          <span><span className="font-semibold text-emerald-700">{counts.on_track}</span> on track</span>
          <span><span className="font-semibold text-amber-700">{counts.at_risk}</span> at risk</span>
          <span><span className="font-semibold text-red-700">{counts.behind}</span> behind</span>
          <span className="text-stone-500">The line on each bar shows how much of the period has gone.</span>
        </p>
      )}
      {q.isLoading ? <Spinner /> : q.error ? <ErrorState error={q.error} /> : rows.length === 0 ? (
        <Card><EmptyState title={when === "ended" ? "No ended goals" : "No goals yet"}>
          Set a goal for the company, a department or yourself, and MannaBooks tracks it as the period goes.
        </EmptyState></Card>
      ) : (
        <div className="space-y-6">
          {groups.map(([level, label]) => {
            const mine = rows.filter((g) => g.level === level);
            if (!mine.length) return null;
            return (
              <section key={level}>
                <h2 className="mb-2 text-sm font-semibold text-stone-700">{label} ({mine.length})</h2>
                <div className="grid gap-3 lg:grid-cols-2">{mine.map((g) => <GoalCard key={g.id} g={g} />)}</div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
