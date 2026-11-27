"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";

import { api, unwrap } from "@/lib/api/client";

export type Presence = { active: boolean; state?: "in" | "on_break" | "done" | "out" | null; since?: string | null; last_active_at?: string | null };

const hm = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "");

/** Green: active now, or clocked in. Amber: on a break. Grey: clocked out, not in yet, or not active. */
export function presenceTone(p: Presence): "green" | "amber" | "grey" {
  if (p.state === "on_break") return "amber";
  if (p.state === "in") return "green";
  if (p.state === "done" || p.state === "out") return "grey";
  return p.active ? "green" : "grey";
}

export function presenceLabel(p: Presence, you = false): string {
  if (p.state === "in") return `Clocked in${p.since ? ` since ${hm(p.since)}` : ""}`;
  if (p.state === "on_break") return `On a break${p.since ? ` since ${hm(p.since)}` : ""}`;
  if (p.state === "done") return `Clocked out${p.since ? ` at ${hm(p.since)}` : ""}`;
  if (p.state === "out") return you ? "Not clocked in yet" : `Not in yet${p.active ? ", but active now" : ""}`;
  if (p.active) return "Active now";
  return p.last_active_at ? `Last active ${new Date(p.last_active_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Not active";
}

export function PresenceDot({ p, className, you = false }: { p?: Presence | null; className?: string; you?: boolean }) {
  if (!p) return null;
  const tone = presenceTone(p);
  const label = presenceLabel(p, you);
  return (
    <span title={label} aria-label={label} role="img"
      className={clsx("inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white",
        tone === "green" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-400" : "bg-stone-300", className)} />
  );
}

/** The status of these employees, as the business's setting allows (people you may not see are left out). */
export function usePresence(slug: string, ids: string[]) {
  const key = [...new Set(ids)].sort().join(",");
  const q = useQuery({
    queryKey: ["presence", slug, key], enabled: Boolean(key), refetchInterval: 60_000, refetchIntervalInBackground: false,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/employees/presence/", { params: { path: { workspace: slug }, query: { ids: key } } })),
  });
  return Object.fromEntries((q.data ?? []).map((r) => [r.employee_id, r as Presence])) as Record<string, Presence>;
}
