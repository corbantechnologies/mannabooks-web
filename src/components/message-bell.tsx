"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { api, unwrap } from "@/lib/api/client";

const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/**
 * The in-app inbox: everything MannaBooks emails you about this workspace (a task given, a report due, an approval
 * waiting) also lands here, with the unread count on the bell.
 */
export function MessageBell({ slug }: { slug: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const path = { params: { path: { workspace: slug } } };
  const unread = useQuery({
    queryKey: ["messages", slug, "unread"], refetchInterval: 60000, retry: false,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/messages/", { params: { path: { workspace: slug }, query: { unread: true, page_size: 1 } as never } })),
  });
  const recent = useQuery({
    queryKey: ["messages", slug, "recent"], enabled: open,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/messages/", { params: { path: { workspace: slug }, query: { page_size: 15 } as never } })),
  });
  const mark = useMutation({
    mutationFn: async (ids?: string[]) => unwrap(await api.POST("/api/v1/w/{workspace}/messages/read/", { ...path, body: ids ? { ids } : {} })),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["messages", slug] }),
  });
  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", esc); };
  }, [open]);
  const count = unread.data?.count ?? 0;
  const rows = recent.data?.results ?? [];

  return (
    <div className="relative" ref={box}>
      <button type="button" aria-label={count ? `${count} unread messages` : "Messages"} onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-2 text-stone-600 hover:bg-stone-100">
        <Bell className="h-5 w-5" />
        {count > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-semibold leading-4 text-white">{count > 99 ? "99+" : count}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-[22rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border border-stone-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-stone-200 px-3 py-2">
            <span className="text-sm font-semibold">Messages</span>
            {count > 0 && <button type="button" className="text-xs text-brand-700 hover:underline" onClick={() => mark.mutate(undefined)}>Mark all read</button>}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {recent.isLoading ? <p className="p-4 text-sm text-stone-500">Loading…</p> : rows.length === 0 ? (
              <p className="p-4 text-sm text-stone-500">Nothing yet. Tasks, reports and approvals for you show up here.</p>
            ) : rows.map((m) => (
              <button key={m.id} type="button" onClick={() => { if (!m.read) mark.mutate([m.id]); setOpen(false); if (m.link) router.push(m.link); }}
                className={`block w-full border-b border-stone-100 px-3 py-2.5 text-left hover:bg-stone-50 ${m.read ? "" : "bg-brand-50/60"}`}>
                <span className="flex items-start justify-between gap-2">
                  <span className={`text-sm ${m.read ? "text-stone-700" : "font-semibold text-stone-900"}`}>{m.title}</span>
                  <span className="shrink-0 text-[11px] text-stone-500">{ago(m.created_at)}</span>
                </span>
                {m.body && <span className="mt-0.5 line-clamp-2 block text-xs text-stone-600">{m.body}</span>}
              </button>
            ))}
          </div>
          <Link href={`/w/${slug}/messages`} onClick={() => setOpen(false)} className="block border-t border-stone-200 px-3 py-2 text-center text-xs text-brand-700 hover:bg-stone-50">See all messages</Link>
        </div>
      )}
    </div>
  );
}
