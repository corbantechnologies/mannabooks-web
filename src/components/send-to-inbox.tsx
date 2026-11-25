"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { api, unwrap } from "@/lib/api/client";
import { useWorkspace, wsPath } from "@/lib/workspace";

import { Button, Field, FormError, Modal, Select, Textarea } from "./ui";

type Kind = "invoice" | "quotation" | "purchase_order" | "remittance";

/**
 * "Send to their MannaBooks": shown only when the customer's or supplier's KRA PIN matches another business on MannaBooks.
 * The document lands in their Business inbox, where one click turns it into their bill, LPO or invoice.
 */
export function SendToInbox({ kind, id, disabled }: { kind: Kind; id: string; disabled?: boolean }) {
  const { slug, can } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [to, setTo] = useState("");
  const qc = useQueryClient();
  const preview = useQuery({
    queryKey: ["inbox-preview", slug, kind, id], enabled: can("inbox.send") && !disabled, retry: false,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/inbox/preview/", { params: { path: { workspace: slug }, query: { kind, document_id: id } } })),
  });
  const send = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/inbox/send/", { ...wsPath(slug), body: { kind: kind as never, document_id: id, message, to_workspace_id: to || null } })),
    onSuccess: (m) => {
      toast.success(`Sent to ${m.recipient_name}'s inbox`); setOpen(false); setMessage("");
      void qc.invalidateQueries({ queryKey: ["inbox-preview", slug] });
    },
  });
  const p = preview.data;
  if (!p?.available || disabled) return null;
  const waiting = p.last_status === "new" || p.last_status === "accepted";
  const name = p.choices.find((c) => c.id === to)?.name ?? (p.recipient_name || "their business");
  return (
    <>
      {/* short label: a long business name made the button push the page sideways; the name is in the tooltip and the form */}
      <Button variant="secondary" disabled={waiting} className="max-w-full"
        title={waiting ? `Already in ${p.recipient_name}'s inbox (${p.last_status})` : `Send to ${p.recipient_name}'s Business inbox on MannaBooks`}
        onClick={() => { send.reset(); setTo(p.recipient_id ?? ""); setOpen(true); }}>
        <span className="truncate">{waiting ? "In their inbox" : "Send on MannaBooks"}</span>
      </Button>
      <Modal open={open} title={`Send to ${name}`} onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
          <RecipientChoice choices={p.choices} value={to} onChange={setTo} />
          <p className="text-sm text-stone-600">
            {name} uses MannaBooks (KRA PIN {p.kra_pin}). This goes straight to their Business inbox, where they can accept it into their own books.
            {p.last_status === "declined" ? " They declined it last time; send it again once it is fixed." : ""}
          </p>
          <Field label="Message (optional)"><Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Thank you for your business." /></Field>
          <FormError error={send.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={send.isPending} disabled={p.choices.length > 1 && !to}>Send</Button></div>
        </form>
      </Modal>
    </>
  );
}

/** When their KRA PIN matches more than one business on MannaBooks (one company, several businesses): which one. Remembered. */
export function RecipientChoice({ choices, value, onChange }: { choices: { id: string; name: string }[]; value: string; onChange: (v: string) => void }) {
  if (choices.length < 2) return null;
  return (
    <Field label="Which of their businesses?" hint="More than one business on MannaBooks has this KRA PIN. Your choice is remembered for this customer or supplier.">
      <Select value={value} onChange={(e) => onChange(e.target.value)} required>
        <option value="">Choose the business</option>
        {choices.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
    </Field>
  );
}
