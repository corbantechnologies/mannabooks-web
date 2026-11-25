"use client";

import { useRouter } from "next/navigation";

import { EmployeeEditor } from "@/components/employee-editor";
import { useWorkspace } from "@/lib/workspace";

/** New employee: a page of its own, as the form is too long for a pop-up. Saving opens their profile. */
export default function NewEmployeePage() {
  const router = useRouter();
  const { slug } = useWorkspace();
  return <EmployeeEditor employee="new" onClose={() => router.push(`/w/${slug}/employees`)} onSaved={(e) => router.push(`/w/${slug}/employees/${e.id}`)} />;
}
