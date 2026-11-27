"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { RegisterItemForm } from "@/components/register-item-form";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function EditRegisterItemPage() {
  const { slug } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const item = useQuery({ queryKey: ["register-item", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/registers/items/{id}/", { params: { path: { workspace: slug, id } } })) });
  const regs = useQuery({ queryKey: ["registers", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/registers/", wsPath(slug))) });
  if (item.isLoading || regs.isLoading) return <Spinner />;
  if (item.error || regs.error) return <ErrorState error={item.error ?? regs.error} />;
  const reg = regs.data?.find((r) => r.id === item.data?.register_id);
  if (!item.data || !reg) return <EmptyState title="Not found" />;
  if (!item.data.can_manage) return <EmptyState title="Only the person responsible for it, or someone who manages registers, can change it" />;
  return <RegisterItemForm register={reg} item={item.data} />;
}
