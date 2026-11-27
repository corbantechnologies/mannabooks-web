"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";

import { safeBack, ServiceEditor } from "@/components/portfolio-service-form";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace } from "@/lib/workspace";

/** Change a service in a client's portfolio. */
export default function EditServicePage() {
  const { id, sid } = useParams<{ id: string; sid: string }>();
  const sp = useSearchParams();
  const { slug } = useWorkspace();
  const q = useQuery({ queryKey: ["portfolio", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/portfolios/{id}/", { params: { path: { workspace: slug, id } } })) });
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} />;
  const service = q.data.services.find((s) => s.id === sid);
  if (!service) return <EmptyState title="This service isn't there any more" />;
  if (!q.data.can_manage) return <EmptyState title="Only the portfolio's lead or someone who manages portfolios can change it" />;
  return <ServiceEditor key={service.id} d={q.data} service={service} back={safeBack(slug, id, sp.get("back"))} />;
}
