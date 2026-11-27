"use client";

import { useRouter } from "next/navigation";

import { TaskForm } from "@/components/task-form";
import { AsPage } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";

export default function NewTaskPage() {
  const { slug } = useWorkspace();
  const router = useRouter();
  return <AsPage guide="tasks"><TaskForm onClose={() => router.push(`/w/${slug}/tasks`)} /></AsPage>;
}
