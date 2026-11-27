"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";

import { safeBack, ServiceEditor } from "@/components/portfolio-service-form";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace } from "@/lib/workspace";

/** Add a service to a client's portfolio (into a group with ?group=). */
export default function NewServicePage() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const { slug } = useWorkspace();
  const q = useQuery({ queryKey: ["portfolio", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/portfolios/{id}/", { params: { path: { workspace: slug, id } } })) });
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} />;
  if (!q.data.can_manage) return <EmptyState title="Only the portfolio's lead or someone who manages portfolios can add services" />;
  const group = sp.get("group") ?? "";
  return <ServiceEditor d={q.data} groupId={q.data.groups.some((g) => g.id === group) ? group : ""} back={safeBack(slug, id, sp.get("back"))} />;
}
