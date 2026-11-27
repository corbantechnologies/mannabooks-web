"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import { RegisterItemForm } from "@/components/register-item-form";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function NewRegisterItemPage() {
  const { slug } = useWorkspace();
  const id = useSearchParams().get("register");
  const regs = useQuery({ queryKey: ["registers", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/registers/", wsPath(slug))) });
  if (regs.isLoading) return <Spinner />;
  if (regs.error) return <ErrorState error={regs.error} />;
  const reg = regs.data?.find((r) => r.id === id);
  if (!reg) return <EmptyState title="Choose a register first" />;
  return <RegisterItemForm register={reg} />;
}
