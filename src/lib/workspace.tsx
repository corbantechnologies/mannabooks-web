"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { createContext, useContext } from "react";

import { api, unwrap } from "@/lib/api/client";
import type { WorkspaceContext } from "@/lib/api/types";

interface WorkspaceState {
  slug: string;
  context: WorkspaceContext;
  /** Whether the signed-in member holds a permission, e.g. can("employees.manage"). */
  can: (code: string) => boolean;
}

const Ctx = createContext<WorkspaceState | null>(null);

export function grants(held: string[], code: string): boolean {
  const mod = code.split(".")[0];
  return held.includes("*") || held.includes(code) || held.includes(`${mod}.*`);
}

export function useWorkspaceSlug(): string {
  return useParams<{ slug: string }>().slug;
}

export function useWorkspaceContextQuery(slug: string) {
  return useQuery({
    queryKey: ["workspace-context", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/context/", { params: { path: { workspace: slug } } })),
  });
}

export function WorkspaceProvider({ slug, context, children }: { slug: string; context: WorkspaceContext; children: React.ReactNode }) {
  const can = (code: string) => grants(context.permissions, code);
  return <Ctx.Provider value={{ slug, context, can }}>{children}</Ctx.Provider>;
}

export function useWorkspace(): WorkspaceState {
  const value = useContext(Ctx);
  if (!value) throw new Error("useWorkspace must be used inside a workspace page.");
  return value;
}

/** Path params for workspace-scoped API calls. */
export function wsPath(slug: string) {
  return { params: { path: { workspace: slug } } };
}
