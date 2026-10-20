"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { api, unwrap } from "@/lib/api/client";
import { useWorkspace, wsPath } from "@/lib/workspace";

import { Button, Field, FormError, Modal, Textarea } from "./ui";

type Kind = "invoice" | "quotation" | "purchase_order";

/**
 * "Send to their MannaBooks": shown only when the customer's or supplier's KRA PIN matches another business on MannaBooks.
 * The document lands in their Business inbox, where one click turns it into their bill, LPO or invoice.
 */
export function SendToInbox({ kind, id, disabled }: { kind: Kind; id: string; disabled?: boolean }) {
  const { slug, can } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const preview = useQuery({
    queryKey: ["inbox-preview", slug, kind, id], enabled: can("inbox.send") && !disabled, retry: false,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/inbox/preview/", { params: { path: { workspace: slug }, query: { kind, document_id: id } } })),
  });
  const send = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/inbox/send/", { ...wsPath(slug), body: { kind: kind as never, document_id: id, message } })),
    onSuccess: (m) => { toast.success(`Sent to ${m.recipient_name}'s inbox`); setOpen(false); setMessage(""); },
  });
  const p = preview.data;
  if (!p?.available || disabled) return null;
  const waiting = p.last_status === "new" || p.last_status === "accepted";
  return (
    <>
      <Button variant="secondary" disabled={waiting} title={waiting ? `Already in ${p.recipient_name}'s inbox (${p.last_status})` : undefined} onClick={() => { send.reset(); setOpen(true); }}>
        {waiting ? `In ${p.recipient_name}'s inbox` : `Send to ${p.recipient_name} on MannaBooks`}
      </Button>
      <Modal open={open} title={`Send to ${p.recipient_name}`} onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
          <p className="text-sm text-stone-600">
            {p.recipient_name} uses MannaBooks (KRA PIN {p.kra_pin}). This goes straight to their Business inbox, where they can accept it into their own books.
            {p.last_status === "declined" ? " They declined it last time; send it again once it is fixed." : ""}
          </p>
          <Field label="Message (optional)"><Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Thank you for your business." /></Field>
          <FormError error={send.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={send.isPending}>Send</Button></div>
        </form>
      </Modal>
    </>
  );
}
