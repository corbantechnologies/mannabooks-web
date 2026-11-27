"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";

import { TaskForm } from "@/components/task-form";
import { AsPage, ErrorState, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace } from "@/lib/workspace";

export default function EditTaskPage() {
  const { slug } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const q = useQuery({ queryKey: ["task", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/tasks/{id}/", { params: { path: { workspace: slug, id } } })) });
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} />;
  return <AsPage guide="tasks"><TaskForm key={q.data.id} task={q.data} onClose={() => router.push(`/w/${slug}/tasks/${id}`)} /></AsPage>;
}
