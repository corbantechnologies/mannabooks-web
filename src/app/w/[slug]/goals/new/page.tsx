"use client";

import { useSearchParams } from "next/navigation";

import { GoalForm } from "@/components/goal-form";

/** New goal. `?parent=<id>` starts it under a bigger goal. */
export default function NewGoalPage() {
  const parent = useSearchParams().get("parent") ?? undefined;
  return <GoalForm parentId={parent} />;
}
