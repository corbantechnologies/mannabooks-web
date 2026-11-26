"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, Briefcase } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { query, ReportScopePicker, scopeFrom, type ReportScope } from "@/components/portfolio-report-scope";
import { Card, ErrorState, PageHeader, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace } from "@/lib/workspace";

/** The client portfolio reports: for one client or group, and across all clients. */
export default function PortfolioReportsPage() {
  const { slug } = useWorkspace();
  const router = useRouter();
  const sp = useSearchParams();
  const scope = scopeFrom(sp);
  const set = (v: ReportScope) => router.replace(`/w/${slug}/portfolios/reports${query(v)}`);
  const list = useQuery({
    queryKey: ["portfolio-reports", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/portfolios/reports/", { params: { path: { workspace: slug } } })),
  });
  const back = scope.group ? `/w/${slug}/portfolios/${scope.portfolio}/groups/${scope.group}` : scope.portfolio ? `/w/${slug}/portfolios/${scope.portfolio}` : `/w/${slug}/portfolios`;
  if (list.isLoading) return <Spinner />;
  if (list.error || !list.data) return <ErrorState error={list.error} />;
  const area = (a: "client" | "business") => list.data.filter((r) => r.area === a);
  return (
    <div className="w-full">
      <Link href={back} className="text-sm text-stone-500 hover:underline">&larr; {scope.portfolio ? "Back to the portfolio" : "Client portfolios"}</Link>
      <PageHeader title="Portfolio reports" guide="client-portfolios"
        description="Choose who a report covers: all clients, one client, one of their groups, or one lead's clients. Every report prints, saves as PDF and downloads as CSV." />
      <Card className="mb-4 p-4"><ReportScopePicker value={scope} onChange={set} /></Card>
      {([["client", "For a client or a group", Briefcase, "Also work across all clients."], ["business", "Across all clients", BarChart3, "Also work for one client, group or lead."]] as const).map(([a, title, Icon, hint]) => (
        <section key={a} className="mb-6">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-stone-800"><Icon className="h-4 w-4 text-stone-500" /> {title}</h2>
          <p className="mb-3 text-xs text-stone-500">{hint}</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {area(a).map((r) => (
              <Link key={r.key} href={`/w/${slug}/portfolios/reports/${r.key}${query(scope)}`}
                className="block rounded-lg border border-stone-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm">
                <p className="font-medium text-brand-800">{r.title}</p>
                <p className="mt-1 text-sm text-stone-600">{r.description}</p>
                {r.filters.includes("client_required") && <p className="mt-2 text-xs text-stone-500">Choose a client. Safe to send them: no costs or margins.</p>}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
