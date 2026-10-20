"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

import { Badge, Button, Field, FormError, Input, Modal, Textarea } from "./ui";

export type EmailDocType = "invoice" | "quotation" | "credit_note" | "cash_sale" | "purchase_order";

/** "Send by email" for a document: To (the customer's or supplier's email, editable), CC, subject and a note, plus what was sent before. */
export function SendEmailButton({ docType, id, disabled, label = "Send by email" }: { docType: EmailDocType; id: string; disabled?: boolean; label?: string }) {
  const { slug } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ to: string; cc: string; subject: string; message: string } | null>(null);
  const query = { document_type: docType, object_id: id };
  const draft = useQuery({
    queryKey: ["document-email-draft", slug, docType, id],
    enabled: open,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/document-emails/draft/", { params: { path: { workspace: slug }, query } })),
  });
  const history = useQuery({
    queryKey: ["document-emails", slug, docType, id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/document-emails/", { params: { path: { workspace: slug }, query } })),
  });
  const f = form ?? (draft.data ? { to: draft.data.to, cc: draft.data.cc, subject: draft.data.subject, message: draft.data.message } : null);
  const set = (k: "to" | "cc" | "subject" | "message") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...f!, [k]: e.target.value });
  const send = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/document-emails/", { params: { path: { workspace: slug } }, body: { ...query, ...f! } })),
    onSuccess: (e) => { toast.success(`Sending to ${e.to}`); setOpen(false); setForm(null); },
  });
  const last = history.data?.[0];
  return (
    <>
      <Button variant="secondary" disabled={disabled} title={last ? `Last sent to ${last.to}` : undefined} onClick={() => { send.reset(); setOpen(true); }}>
        <Mail className="h-4 w-4" /> {label}
      </Button>
      <Modal size="lg" open={open} title="Send by email" onClose={() => setOpen(false)}>
        {!f ? <p className="py-6 text-sm text-stone-500">Preparing...</p> : (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="To" hint="Separate several addresses with commas."><Input required value={f.to} onChange={set("to")} placeholder="accounts@customer.co.ke" /></Field>
              <Field label="CC (optional)"><Input value={f.cc} onChange={set("cc")} /></Field>
            </div>
            <Field label="Subject"><Input required value={f.subject} onChange={set("subject")} /></Field>
            <Field label="Message" hint="The items, total, how to pay and (for invoices) a link to view and pay online are added below your message.">
              <Textarea rows={7} value={f.message} onChange={set("message")} />
            </Field>
            <FormError error={send.error} />
            {(history.data ?? []).length > 0 && (
              <div className="rounded-md bg-stone-50 p-3 text-xs text-stone-600">
                <p className="mb-1 font-medium text-stone-800">Sent before</p>
                {history.data!.slice(0, 5).map((e) => (
                  <p key={e.id}>
                    {fmtDate(e.sent_at ?? e.created_at)} to {e.to}{e.sent_by_name ? ` by ${e.sent_by_name}` : ""}{" "}
                    <Badge tone={e.status === "sent" ? "green" : e.status === "failed" ? "red" : "amber"}>{e.status === "sent" ? "Sent" : e.status === "failed" ? "Not sent" : "Sending"}</Badge>
                    {e.status === "failed" && e.error ? <span className="text-red-700"> {e.error}</span> : null}
                  </p>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={send.isPending}><Mail className="h-4 w-4" /> Send</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
