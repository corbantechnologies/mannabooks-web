"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

const CATEGORIES: [string, string][] = [["question", "Question"], ["problem", "Something isn't working"], ["billing", "Billing and payments"], ["complaint", "Complaint"], ["idea", "Idea or request"]];
const STATUS: Record<string, [string, "blue" | "amber" | "green" | "stone"]> = { open: ["Open", "blue"], waiting: ["MannaBooks replied", "amber"], resolved: ["Resolved", "green"], closed: ["Closed", "stone"] };

export default function HelpPage() {
  const { slug } = useWorkspace();
  const [opening, setOpening] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useQuery({ queryKey: ["support", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/support/", { params: { path: { workspace: slug } } })) });
  const rows = list.data?.results ?? [];
  const ticket = rows.find((t) => t.id === openId);
  return (
    <div className="w-full">
      <PageHeader title="Help and feedback" guide="help-and-feedback"
        description="Ask MannaBooks a question, report a problem, or tell us what would make it better. We reply here and by email."
        actions={<Button onClick={() => setOpening(true)}><Plus className="h-4 w-4" /> New message</Button>} />
      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <Card>
          {list.isLoading ? <div className="px-4"><Spinner /></div> : rows.length === 0 ? <EmptyState title="Nothing yet">Your messages to MannaBooks appear here.</EmptyState> : (
            <ul className="divide-y divide-stone-100">
              {rows.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => setOpenId(t.id)} className={`w-full px-4 py-3 text-left text-sm hover:bg-stone-50 ${openId === t.id ? "bg-brand-50" : ""}`}>
                    <p className="font-medium text-stone-900">{t.subject}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-stone-500">{t.number} · {fmtDate(t.updated_at)} <Badge tone={STATUS[t.status][1]}>{STATUS[t.status][0]}</Badge></p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {ticket ? <Conversation id={ticket.id} /> : <Card className="p-6 text-sm text-stone-500">Choose a message, or start a new one. The user guides answer most questions too.</Card>}
      </div>
      <NewTicket open={opening} onClose={() => setOpening(false)} onOpened={(id) => setOpenId(id)} />
    </div>
  );
}

function Conversation({ id }: { id: string }) {
  const { slug } = useWorkspace();
  const path = { params: { path: { workspace: slug, id } } };
  const t = useQuery({ queryKey: ["support-ticket", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/support/{id}/", path)) });
  const [body, setBody] = useState("");
  const reply = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/support/{id}/reply/", { ...path, body: { body, internal: false } })),
    onSuccess: () => setBody(""),
  });
  const close = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/support/{id}/close/", path)),
    onSuccess: () => toast.success("Marked resolved. Thank you."),
  });
  if (!t.data) return <Spinner />;
  const ticket = t.data;
  return (
    <Card className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-4 py-3">
        <div><p className="font-semibold">{ticket.subject}</p><p className="text-xs text-stone-500">{ticket.number} · {CATEGORIES.find(([k]) => k === ticket.category)?.[1]}</p></div>
        {ticket.status !== "resolved" && ticket.status !== "closed" && <Button variant="secondary" loading={close.isPending} onClick={() => close.mutate()}>It&apos;s sorted</Button>}
      </div>
      <ul className="flex-1 space-y-3 p-4">
        {ticket.messages.map((m, i) => (
          <li key={i} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.staff ? "bg-brand-50 text-stone-800" : "ml-auto bg-stone-100 text-stone-800"}`}>
            <p className="whitespace-pre-line">{m.body}</p>
            <p className="mt-1 text-xs text-stone-500">{m.staff ? `${m.author_name}, MannaBooks` : m.author_name} · {new Date(m.at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</p>
          </li>
        ))}
      </ul>
      {ticket.status !== "closed" && (
        <form className="space-y-2 border-t border-stone-100 p-4" onSubmit={(e) => { e.preventDefault(); reply.mutate(); }}>
          <Textarea rows={3} required value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply" />
          <FormError error={reply.error} />
          <div className="flex justify-end"><Button type="submit" loading={reply.isPending}>Send</Button></div>
        </form>
      )}
    </Card>
  );
}

function NewTicket({ open, onClose, onOpened }: { open: boolean; onClose: () => void; onOpened: (id: string) => void }) {
  const { slug } = useWorkspace();
  const [form, setForm] = useState({ category: "question", subject: "", body: "" });
  const send = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/support/", {
      params: { path: { workspace: slug } }, body: { ...form, category: form.category as never, page: typeof document !== "undefined" ? document.referrer : "" },
    })),
    onSuccess: (t) => { toast.success(`Sent as ${t.number}. We'll reply here and by email.`); setForm({ category: "question", subject: "", body: "" }); onOpened(t.id); onClose(); },
  });
  return (
    <Modal open={open} title="Message MannaBooks" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
        <Field label="About"><Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>{CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
        <Field label="Subject"><Input required value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="The invoice print is blank" /></Field>
        <Field label="Tell us more" hint="What you did, what happened, and what you expected. Screens or numbers help."><Textarea required rows={5} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} /></Field>
        <FormError error={send.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={send.isPending}>Send</Button></div>
      </form>
    </Modal>
  );
}
