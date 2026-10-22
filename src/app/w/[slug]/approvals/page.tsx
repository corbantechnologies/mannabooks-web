"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Settings2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ApprovalChain, DecideModal } from "@/components/approval-panel";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { APPROVAL_STATUS, type ApprovalRequest } from "@/lib/api/control";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

const BOXES = [
  { key: "waiting", label: "Waiting for me" },
  { key: "mine", label: "I asked" },
  { key: "all", label: "Everything", perm: "approvals.view" },
] as const;

export default function ApprovalsPage() {
  const { slug, can } = useWorkspace();
  const [box, setBox] = useState<"waiting" | "mine" | "all">("waiting");
  const [deciding, setDeciding] = useState<{ req: ApprovalRequest; decision: "approved" | "rejected" } | null>(null);
  const list = useQuery({
    queryKey: ["approvals", slug, box],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/approvals/", { params: { path: { workspace: slug }, query: { box, page_size: 100 } } })),
  });
  const rows = list.data?.results ?? [];
  return (
    <div className="w-full">
      <PageHeader title="Approvals" description="Orders, vouchers, payroll and budgets that need someone's go-ahead, level by level." guide="approvals"
        actions={can("approvals.view") && <Link href={`/w/${slug}/approvals/rules`}><Button variant="secondary"><Settings2 className="h-4 w-4" /> Rules</Button></Link>} />
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-stone-200">
        {BOXES.filter((b) => !("perm" in b) || can(b.perm)).map((b) => (
          <button key={b.key} onClick={() => setBox(b.key)}
            className={clsx("-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm", box === b.key ? "border-brand-700 font-medium text-brand-800" : "border-transparent text-stone-500 hover:text-stone-800")}>
            {b.label}{b.key === "waiting" && box === "waiting" && rows.length > 0 ? ` (${rows.length})` : ""}
          </button>
        ))}
      </div>
      {list.isLoading ? <Spinner /> : list.error ? <ErrorState error={list.error} /> : rows.length === 0 ? (
        <Card><EmptyState title={box === "waiting" ? "Nothing is waiting for you" : "No requests"}>{box === "waiting" ? "When something needs your approval it shows here, and you get an email." : null}</EmptyState></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/w/${slug}${r.link}`} className="font-medium text-stone-900 hover:underline">{r.document_label} {r.document_number}</Link>
                    <Badge tone={APPROVAL_STATUS[r.status ?? "pending"].tone}>{APPROVAL_STATUS[r.status ?? "pending"].label}</Badge>
                  </div>
                  <p className="text-sm text-stone-600">{r.summary}</p>
                  <p className="text-xs text-stone-500">Asked by {r.requested_by_name} on {fmtDate(r.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-semibold">{fmt(r.amount)}</p>
                  {r.can_decide && (
                    <div className="mt-2 flex gap-2">
                      <Button variant="secondary" onClick={() => setDeciding({ req: r, decision: "rejected" })}>Don&apos;t approve</Button>
                      <Button onClick={() => setDeciding({ req: r, decision: "approved" })}>Approve</Button>
                    </div>
                  )}
                </div>
              </div>
              <ApprovalChain req={r} />
              {r.steps.filter((s) => s.comment).map((s) => <p key={s.id} className="text-sm text-stone-600"><span className="font-medium">{s.decided_by_name}:</span> {s.comment}</p>)}
            </Card>
          ))}
        </div>
      )}
      <DecideModal req={deciding?.req ?? null} decision={deciding?.decision ?? "approved"} onClose={() => setDeciding(null)} />
    </div>
  );
}
