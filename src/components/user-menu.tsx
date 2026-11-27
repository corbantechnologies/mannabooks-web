"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, LogOut, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import toast from "react-hot-toast";

import { PresenceDot, presenceLabel, type Presence } from "@/components/presence";
import { api, unwrap } from "@/lib/api/client";

type ClockAction = "in" | "out" | "break_start" | "break_end";
const CLOCK_DONE: Record<ClockAction, string> = { in: "Clocked in", out: "Clocked out", break_start: "Enjoy your break", break_end: "Welcome back" };

export function UserMenu() {
  const { data } = useSession();
  const [open, setOpen] = useState(false);
  const name = data?.user?.name || data?.user?.email || "Account";
  const me = useQuery({ queryKey: ["me"], enabled: Boolean(data), staleTime: 300000, queryFn: async () => unwrap(await api.GET("/api/v1/auth/me/")) });
  // inside a workspace: your status there (the same query as the workspace layout's)
  const slug = usePathname()?.match(/^\/w\/([^/]+)/)?.[1] ?? "";
  const qc = useQueryClient();
  const ctx = useQuery({
    queryKey: ["workspace-context", slug], enabled: Boolean(slug && data),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/context/", { params: { path: { workspace: slug } } })),
  });
  const status = (slug ? ctx.data?.my_status : null) as (Presence & { can_clock?: boolean }) | null | undefined;
  const clock = useMutation({
    mutationFn: async (action: ClockAction) => unwrap(await api.POST("/api/v1/w/{workspace}/attendance/clock/", { params: { path: { workspace: slug } }, body: { action } })),
    onSuccess: (_d, action) => {
      toast.success(CLOCK_DONE[action]);
      void qc.invalidateQueries({ queryKey: ["workspace-context", slug] });
      void qc.invalidateQueries({ queryKey: ["attendance-me", slug] });
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const actions: [ClockAction, string][] = !status?.can_clock ? []
    : status.state === "in" ? [["break_start", "Start a break"], ["out", "Clock out"]]
    : status.state === "on_break" ? [["break_end", "End the break"], ["out", "Clock out"]]
    : [["in", "Clock in"]];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-stone-700 hover:bg-stone-100"
        aria-expanded={open}
      >
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
          {name.slice(0, 1).toUpperCase()}
          {status && <PresenceDot p={status} you className="absolute -bottom-0.5 -right-0.5" />}
        </span>
        <span className="hidden max-w-40 truncate lg:inline">{name}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-56 rounded-md border border-stone-200 bg-white py-1 shadow-lg" onMouseLeave={() => setOpen(false)}>
          {status && (
            <div className="mb-1 border-b border-stone-100 px-3 pb-2 pt-1">
              <p className="flex items-center gap-2 text-sm text-stone-700"><PresenceDot p={status} you />{presenceLabel(status, true)}</p>
              {actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {actions.map(([a, label]) => (
                    <button key={a} type="button" disabled={clock.isPending} onClick={() => clock.mutate(a)}
                      className={a === "out" ? "rounded border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                        : "rounded bg-brand-700 px-2 py-1 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"}>{label}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          <Link href="/workspaces" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-stone-50">
            <Building2 className="h-4 w-4" /> Your workspaces
          </Link>
          <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-stone-50">
            <UserRound className="h-4 w-4" /> My account
          </Link>
          {me.data?.is_staff && (
            <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-stone-50">
              <ShieldCheck className="h-4 w-4" /> MannaBooks admin
            </Link>
          )}
          <button
            onClick={async () => {
              await fetch("/api/session/logout", { method: "POST" });
              signOut({ callbackUrl: "/signin" });
            }}
            className="mt-1 flex w-full items-center gap-2 border-t border-stone-100 px-3 py-2 text-left text-sm hover:bg-stone-50"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
