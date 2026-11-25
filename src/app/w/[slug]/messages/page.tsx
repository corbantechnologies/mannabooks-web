"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Button, Card, EmptyState, ErrorState, PageHeader, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace, wsPath } from "@/lib/workspace";

/** Every message MannaBooks has sent you about this workspace, newest first. The same as your emails, in one place. */
export default function MessagesPage() {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const q = useQuery({
    queryKey: ["messages", slug, "page", unreadOnly],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/messages/", { params: { path: { workspace: slug }, query: { page_size: 100, ...(unreadOnly ? { unread: true } : {}) } as never } })),
  });
  const mark = useMutation({
    mutationFn: async (ids?: string[]) => unwrap(await api.POST("/api/v1/w/{workspace}/messages/read/", { ...wsPath(slug), body: ids ? { ids } : {} })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["messages", slug] });
      void qc.invalidateQueries({ queryKey: ["workspace-context", slug] });  // the Messages count in the menu
    },
  });
  const rows = q.data?.results ?? [];
  return (
    <div className="w-full">
      <PageHeader title="Messages" description="Everything MannaBooks has told you about this business: tasks given to you, reports due, approvals waiting. The same as your emails, kept here."
        actions={<div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setUnreadOnly((v) => !v)}>{unreadOnly ? "Show all" : "Unread only"}</Button>
          <Button variant="secondary" onClick={() => mark.mutate(undefined)}>Mark all read</Button>
        </div>} />
      <Card>
        {q.isLoading ? <div className="px-4"><Spinner /></div> : q.error ? <div className="p-4"><ErrorState error={q.error} /></div> : rows.length === 0 ? (
          <EmptyState title={unreadOnly ? "Nothing unread" : "No messages yet"} />
        ) : (
          <ul className="divide-y divide-stone-100">
            {rows.map((m) => (
              <li key={m.id} className={m.read ? "" : "bg-brand-50/50"}>
                <Link href={m.link || "#"} onClick={() => !m.read && mark.mutate([m.id])} className="block px-4 py-3 hover:bg-stone-50">
                  <span className="flex items-start justify-between gap-3">
                    <span className={m.read ? "text-stone-800" : "font-semibold text-stone-900"}>{m.title}</span>
                    <span className="shrink-0 text-xs text-stone-500">{new Date(m.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </span>
                  {m.body && <span className="mt-1 block whitespace-pre-line text-sm text-stone-600">{m.body}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
