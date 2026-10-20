"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

import { PERIOD_PROBLEM } from "./providers";
import { Button, FormError, Modal } from "./ui";

interface Problem { code: "period_missing" | "period_closed"; message: string; date: string }

/**
 * When a save lands on a date before the first financial year, or in a closed month or year, offer to open the
 * books for that date right here (add the earlier year, or reopen), so nobody has to go to Financial years first.
 */
export function PeriodFixDialog() {
  const { slug, can } = useWorkspace();
  const [problem, setProblem] = useState<Problem | null>(null);
  useEffect(() => {
    const listen = (e: Event) => setProblem((e as CustomEvent<Problem>).detail);
    window.addEventListener(PERIOD_PROBLEM, listen);
    return () => window.removeEventListener(PERIOD_PROBLEM, listen);
  }, []);
  const open = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/periods/open-for-date/", {
      params: { path: { workspace: slug } }, body: { date: problem!.date },
    })),
    onSuccess: (r) => { toast.success(`${r.message} Now save again.`, { duration: 7000 }); setProblem(null); },
  });
  if (!problem) return null;
  const allowed = can("periods.manage");
  const missing = problem.code === "period_missing";
  return (
    <Modal open title={missing ? "That date is before your first financial year" : "That period is closed"} onClose={() => setProblem(null)}>
      <div className="space-y-3 text-sm">
        <p className="text-stone-700">{problem.message}</p>
        {allowed ? (
          <p className="text-stone-600">
            {missing
              ? `MannaBooks can add the financial year that covers ${fmtDate(problem.date)} now. Nothing else changes.`
              : "MannaBooks can reopen it now. If the year was closed, its closing entry is removed and redone when you close it again."}
          </p>
        ) : (
          <p className="text-stone-600">Ask your accountant or the owner to open the books for {fmtDate(problem.date)}, or use a date in an open period.</p>
        )}
        <FormError error={open.error} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setProblem(null)}>{allowed ? "Not now" : "Close"}</Button>
          {allowed && <Button loading={open.isPending} onClick={() => open.mutate()}>{missing ? "Add the year" : "Reopen"} and continue</Button>}
        </div>
      </div>
    </Modal>
  );
}
