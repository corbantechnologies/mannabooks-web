"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import clsx from "clsx";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { ActionMenu } from "@/components/action-menu";
import { serviceEditHref, serviceNewHref } from "@/components/portfolio-service-form";
import { GroupForm, ServiceRows } from "@/components/portfolio-services";
import { Button, Card, EmptyState, ErrorState, PageHeader, Spinner, Table } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt } from "@/lib/format";
import type { PortfolioDetail, PortfolioService } from "@/lib/portfolios";
import { useWorkspace } from "@/lib/workspace";

/** One group in a client's portfolio: its services, what they bring in and cost, and the group's own actions. */
export default function PortfolioGroupPage() {
  const { id, gid } = useParams<{ id: string; gid: string }>();
  const { slug } = useWorkspace();
  const router = useRouter();
  const qc = useQueryClient();
  const key = ["portfolio", slug, id];  // the same data as the portfolio page
  const q = useQuery({ queryKey: key, queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/portfolios/{id}/", { params: { path: { workspace: slug, id } } })) });
  const saved = (d: PortfolioDetail) => qc.setQueryData(key, d);
  const [changing, setChanging] = useState(false);
  const back = `/w/${slug}/portfolios/${id}?tab=groups`;
  const copy = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/portfolios/groups/{id}/duplicate/", { params: { path: { workspace: slug, id: gid } }, body: {} })),
    onSuccess: (r) => {
      const before = new Set(q.data?.groups.map((g) => g.id));
      saved(r);
      const made = r.groups.find((g) => !before.has(g.id));
      toast.success("Copied with its services. Rename it and change what differs.");
      if (made) router.push(`/w/${slug}/portfolios/${id}/groups/${made.id}`);
    },
    onError: (e) => toast.error(e.message),
  });
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} />;
  const d = q.data;
  const g = d.groups.find((x) => x.id === gid);
  if (!g) return (
    <div className="w-full">
      <Link href={back} className="text-sm text-stone-500 hover:underline">&larr; {d.customer_name}</Link>
      <EmptyState title="This group isn't there any more">It may have been deleted. Its services stay in the portfolio.</EmptyState>
    </div>
  );
  const rows = d.services.filter((s) => s.group_id === gid);
  return (
    <div className="w-full">
      <Link href={back} className="text-sm text-stone-500 hover:underline">&larr; {d.customer_name}</Link>
      <PageHeader title={g.name} guide="client-portfolios"
        description={<>A group in {d.customer_name}&apos;s portfolio · {g.services} {g.services === 1 ? "service" : "services"}{g.notes ? ` · ${g.notes}` : ""}</>}
        actions={d.can_manage ? (
          <div className="flex flex-wrap gap-2">
            <Link href={serviceNewHref(slug, id, gid, `/w/${slug}/portfolios/${id}/groups/${gid}`)}><Button><Plus className="h-4 w-4" /> Add a service</Button></Link>
            <ActionMenu actions={[
              { label: "Reports for this group", href: `/w/${slug}/portfolios/reports?portfolio=${id}&group=${gid}` },
              { label: "Change name and note", onClick: () => setChanging(true) },
              { label: "Duplicate the group", onClick: () => copy.mutate() },
              { label: "Delete the group", danger: true, onClick: () => setChanging(true) },
            ]} />
          </div>
        ) : undefined} />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Revenue a month" value={fmt(g.monthly_revenue)} />
        <Stat label="Cost a month" value={fmt(g.monthly_cost)} />
        <Stat label="Margin a month" value={`${fmt(g.monthly_margin)}${g.margin_percent != null ? ` (${Number(g.margin_percent).toFixed(0)}%)` : ""}`} bad={g.loses_money} />
        <Stat label="Revenue a year" value={fmt(Number(g.monthly_revenue) * 12)} />
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No services in this group yet">
            {d.can_manage ? <p className="text-sm text-stone-500">Add one, or open a service on the portfolio and move it here.</p> : undefined}
          </EmptyState>
        ) : (
          <Table head={["Service", "They pay", "A month", "Costs you a month", "Margin", "Next dates", ""]}>
            <ServiceRows rows={rows} d={d} onEdit={(s: PortfolioService) => router.push(serviceEditHref(slug, id, s.id, `/w/${slug}/portfolios/${id}/groups/${gid}`))} onSaved={saved} />
          </Table>
        )}
      </Card>

      {changing && <GroupForm portfolioId={id} group={g} onClose={() => setChanging(false)} onSaved={saved} onDeleted={() => router.push(back)} />}
    </div>
  );
}

function Stat({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className={clsx("break-words font-mono text-base tabular-nums", bad && "text-red-700")}>{value}</p>
    </Card>
  );
}
