"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { GoalForm } from "@/components/goal-form";
import { ErrorState, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace } from "@/lib/workspace";

export default function EditGoalPage() {
  const { id } = useParams<{ id: string }>();
  const { slug } = useWorkspace();
  const q = useQuery({
    queryKey: ["goal", slug, id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/goals/{id}/", { params: { path: { workspace: slug, id } } })),
  });
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} />;
  return <GoalForm goal={q.data} />;
}
