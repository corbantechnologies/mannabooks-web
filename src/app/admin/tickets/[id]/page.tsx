"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, ErrorState, FormError, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { PRIORITY, TICKET_STATUS } from "@/lib/api/platform";

export default function AdminTicketPage() {
  const { id } = useParams<{ id: string }>();
  const path = { params: { path: { id } } };
  const t = useQuery({ queryKey: ["platform-ticket", id], queryFn: async () => unwrap(await api.GET("/api/v1/platform/tickets/{id}/", path)) });
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const reply = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/platform/tickets/{id}/reply/", { ...path, body: { body, internal } })),
    onSuccess: () => { toast.success(internal ? "Note added" : "Reply sent (and emailed)"); setBody(""); },
  });
  const update = useMutation({
    mutationFn: async (patch: { status?: string; priority?: string; assign_to_me?: boolean }) => unwrap(await api.PATCH("/api/v1/platform/tickets/{id}/", { ...path, body: patch as never })),
    onError: (e) => toast.error(e.message),
  });
  if (t.isLoading) return <Spinner />;
  if (t.error) return <ErrorState error={t.error} />;
  const ticket = t.data!;
  return (
    <div className="w-full">
      <Link href="/admin/tickets" className="text-sm text-stone-500 hover:underline">&larr; Support tickets</Link>
      <PageHeader title={`${ticket.number}: ${ticket.subject}`}
        description={`${ticket.raised_by_name} <${ticket.raised_by_email}>${ticket.business ? ` · ${ticket.business}` : ""}${ticket.page ? ` · from ${ticket.page}` : ""}`} />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Select className="max-w-48" value={ticket.status} onChange={(e) => update.mutate({ status: e.target.value })}>{Object.entries(TICKET_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</Select>
        <Select className="max-w-36" value={ticket.priority} onChange={(e) => update.mutate({ priority: e.target.value })}>{Object.entries(PRIORITY).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</Select>
        {ticket.assigned_to_name ? <Badge>{ticket.assigned_to_name}</Badge> : <Button variant="ghost" onClick={() => update.mutate({ assign_to_me: true })}>Assign to me</Button>}
        {ticket.business_slug && <Link href={`/admin/businesses/${ticket.business_slug}`} className="text-brand-700 underline">Open the business</Link>}
      </div>
      <Card>
        <ul className="space-y-3 p-4">
          {ticket.messages.map((m, i) => (
            <li key={i} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.internal ? "border border-dashed border-amber-300 bg-amber-50" : m.staff ? "ml-auto bg-brand-50" : "bg-stone-100"}`}>
              <p className="whitespace-pre-line">{m.body}</p>
              <p className="mt-1 text-xs text-stone-500">{m.author_name}{m.internal ? " (private note)" : m.staff ? " (MannaBooks)" : ""} · {new Date(m.at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</p>
            </li>
          ))}
        </ul>
        <form className="space-y-2 border-t border-stone-100 p-4" onSubmit={(e) => { e.preventDefault(); reply.mutate(); }}>
          <Textarea rows={4} required value={body} onChange={(e) => setBody(e.target.value)} placeholder={internal ? "A note only staff see" : "Reply to the customer (also emailed to them)"} />
          <FormError error={reply.error} />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Private note</label>
            <Button type="submit" loading={reply.isPending}>{internal ? "Add note" : "Send reply"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
