"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarX } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { usePeriod } from "@/lib/period";
import { useWorkspace, wsPath } from "@/lib/workspace";

/**
 * Documents dated outside every financial year show only under "All years", can't be posted, and no year's reports
 * include them. Say so where it matters (Overview, Financial years) and offer the missing year in one click.
 */
export function YearCoverage() {
  const { slug, can } = useWorkspace();
  const { setPeriod } = usePeriod();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["year-coverage", slug], enabled: can("fiscalyears.view"), retry: false,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/fiscal-years/coverage/", wsPath(slug))),
  });
  const add = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/fiscal-years/", { ...wsPath(slug), body: { position: "previous" } })),
    onSuccess: (y) => {
      toast.success(`${y.name} added`);
      void qc.invalidateQueries({ queryKey: ["year-coverage", slug] });
      void qc.invalidateQueries({ queryKey: ["workspace-context", slug] });
    },
    onError: (e) => toast.error(e.message),
  });
  const d = q.data;
  if (!d || d.outside === 0) return null;
  return (
    <div className="mb-4 flex flex-wrap items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <CalendarX className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {d.outside} {d.outside === 1 ? "document is" : "documents are"} dated outside your financial years{d.earliest ? `, the earliest ${fmtDate(d.earliest)}` : ""}.
        </p>
        <p className="mt-0.5 text-amber-900">
          {d.kinds.map((k) => `${k.label}: ${k.count}`).join(" · ")}. They show only under All years, can&apos;t be posted, and no year&apos;s reports include them.
          {d.previous_year_name ? ` Add ${d.previous_year_name} to cover them.` : " Add the year they fall in under Accounting > Financial years."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setPeriod({ yearId: null, month: "" })}>Show all years</Button>
        {d.previous_year_name && can("fiscalyears.manage") && <Button loading={add.isPending} onClick={() => add.mutate()}>Add {d.previous_year_name}</Button>}
      </div>
    </div>
  );
}
