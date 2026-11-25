"use client";

import Link from "next/link";

import { Badge } from "@/components/ui";
import { fmt, fmtDate } from "@/lib/format";
import { BAR, type GoalRow, STATUS_TONE, figures } from "@/lib/goals";
import { useWorkspace } from "@/lib/workspace";

/** One goal as a row: title, whose, the period, a progress bar with a marker for how much of the period has gone. */
export function GoalCard({ g, compact = false }: { g: GoalRow; compact?: boolean }) {
  const { slug } = useWorkspace();
  const pct = Math.min(Number(g.percent), 100);
  const whose = g.level === "company" ? "Company" : g.level === "department" ? g.department_name : g.owner_name;
  return (
    <Link href={`/w/${slug}/goals/${g.id}`} className="block rounded-lg border border-stone-200 bg-white p-3 hover:border-brand-300 hover:bg-stone-50 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="break-words font-medium text-stone-900">{g.title}</p>
          <p className="mt-0.5 text-xs text-stone-500">
            {whose} · {g.period_label}{!compact && g.parent_title ? ` · helps reach ${g.parent_title}` : ""}
          </p>
        </div>
        <Badge tone={STATUS_TONE[g.status]}>{g.status_label}</Badge>
      </div>
      <div className="relative mt-3 h-2 rounded-full bg-stone-100" title={`${Number(g.percent).toFixed(0)}% of the target, ${Number(g.time_percent).toFixed(0)}% of the time gone`}>
        <div className={`h-2 rounded-full ${BAR[g.status]}`} style={{ width: `${pct}%` }} />
        {g.status !== "achieved" && g.status !== "missed" && g.status !== "dropped" && (
          <div className="absolute -top-1 h-4 w-0.5 bg-stone-500" style={{ left: `${Math.min(Number(g.time_percent), 100)}%` }} aria-hidden />
        )}
      </div>
      <p className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-xs text-stone-600">
        <span>{figures(g, fmt)}</span>
        <span className="text-stone-500">{g.status === "not_started" ? `Starts ${fmtDate(g.start_date)}` : `Ends ${fmtDate(g.end_date)}`}</span>
      </p>
    </Link>
  );
}
