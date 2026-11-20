"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { Spinner } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";

/** A department has one page now: its spending, documents and people live on /departments/[id]. */
export default function OldDepartmentLink() {
  const { slug } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => { router.replace(`/w/${slug}/departments/${id}`); }, [router, slug, id]);
  return <Spinner />;
}
