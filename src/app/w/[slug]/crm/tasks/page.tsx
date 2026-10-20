"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ActivityRow } from "@/components/activity-panel";
import { Card, EmptyState, ErrorState, PageHeader, Select, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace } from "@/lib/workspace";

export default function FollowUpsPage() {
  const { slug } = useWorkspace();
  const [who, setWho] = useState("mine");
  const [show, setShow] = useState("open");
  const list = useQuery({
    queryKey: ["activities", slug, "follow-ups", who, show],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/activities/", {
      params: { path: { workspace: slug }, query: { ...(who === "mine" ? { mine: true } : {}), ...(show === "overdue" ? { overdue: true } : { open: show === "open" }), page_size: 200 } },
    })),
  });
  const rows = list.data?.results ?? [];
  return (
    <div className="w-full">
      <PageHeader title="Follow-ups" description="Calls, meetings and tasks to do for leads, deals and customers, soonest first. Tick them off as you go." guide="crm" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Select className="max-w-44" value={who} onChange={(e) => setWho(e.target.value)}><option value="mine">Mine</option><option value="all">Everyone&apos;s</option></Select>
        <Select className="max-w-44" value={show} onChange={(e) => setShow(e.target.value)}><option value="open">To do</option><option value="overdue">Overdue</option><option value="done">Done</option></Select>
      </div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title={show === "done" ? "Nothing done yet" : "Nothing to follow up"}>Add follow-ups from a lead, deal or customer.</EmptyState>
        ) : <ul className="divide-y divide-stone-100">{rows.map((a) => <ActivityRow key={a.id} a={a} showLink />)}</ul>}
      </Card>
    </div>
  );
}
