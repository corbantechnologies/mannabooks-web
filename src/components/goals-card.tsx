"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { GoalCard } from "@/components/goal-card";
import { Card } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace, wsPath } from "@/lib/workspace";

/** Overview: the goals running now that you can see, worst first within company, department and personal. */
export function GoalsCard() {
  const { slug } = useWorkspace();
  const q = useQuery({ queryKey: ["goals", slug, "summary"], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/goals/summary/", wsPath(slug))) });
  const d = q.data;
  return (
    <section>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-700">Goals</h2>
        <Link href={`/w/${slug}/goals`} className="text-sm text-brand-700 hover:underline">All goals &rarr;</Link>
      </div>
      {!d ? null : d.total === 0 ? (
        <Card className="p-4 text-sm text-stone-600">No goals running now. <Link href={`/w/${slug}/goals/new`} className="text-brand-700 hover:underline">Set one</Link> for the company, a department or yourself.</Card>
      ) : (
        <>
          <p className="mb-2 flex flex-wrap gap-x-4 text-sm text-stone-600">
            <span><span className="font-semibold text-emerald-700">{d.on_track}</span> on track</span>
            <span><span className="font-semibold text-amber-700">{d.at_risk}</span> at risk</span>
            <span><span className="font-semibold text-red-700">{d.behind}</span> behind</span>
          </p>
          <div className="grid gap-3 lg:grid-cols-2">{d.goals.map((g) => <GoalCard key={g.id} g={g} compact />)}</div>
        </>
      )}
    </section>
  );
}
