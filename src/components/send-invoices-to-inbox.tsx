"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Field, FormError, Modal, Spinner, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

const SENT: Record<string, [string, "amber" | "green" | "red"]> = { new: ["In their inbox", "amber"], accepted: ["Accepted", "green"], declined: ["Declined", "red"] };

/** On a customer who is on MannaBooks: send many of their invoices to their Business inbox at once, paid ones with their payments. */
export function SendInvoicesToInbox({ customerId }: { customerId: string }) {
  const { slug, can } = useWorkspace();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const allowed = can("inbox.send") && can("invoices.view");
  const q = useQuery({
    queryKey: ["inbox-sendable", slug, customerId], enabled: allowed,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/inbox/sendable/", { params: { path: { workspace: slug }, query: { customer: customerId } } })),
  });
  const send = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/inbox/send-many/", { params: { path: { workspace: slug } }, body: { invoice_ids: picked, message } })),
    onSuccess: (r) => {
      toast.success(`${r.sent.length} sent to ${q.data?.recipient_name}${r.skipped.length ? `; ${r.skipped.length} skipped` : ""}`);
      if (r.skipped.length) toast(r.skipped.map((s) => s.reason).slice(0, 3).join("\n"));
      setPicked([]);
      void qc.invalidateQueries({ queryKey: ["inbox-sendable", slug, customerId] });
      if (!r.skipped.length) setOpen(false);
    },
  });
  if (!allowed || !q.data?.available) return null;
  const rows = q.data.invoices;
  const fresh = rows.filter((r) => !r.sent_status || r.sent_status === "declined").map((r) => r.id);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return (
    <>
      <Button variant="secondary" onClick={() => { setPicked(fresh); send.reset(); setOpen(true); }}><Send className="h-4 w-4" /> Send invoices to {q.data.recipient_name}</Button>
      <Modal open={open} size="lg" title={`Send invoices to ${q.data.recipient_name} on MannaBooks`} onClose={() => setOpen(false)}>
        {q.isLoading ? <Spinner /> : (
          <div className="space-y-4 text-sm">
            <p className="text-stone-600">They arrive in {q.data.recipient_name}&apos;s Business inbox. Paid invoices carry their payments, so {q.data.recipient_name} can record the bill and the payment in one step.</p>
            {rows.length === 0 ? <p className="text-stone-500">No issued invoices for this customer yet.</p> : (
              <div className="max-h-80 overflow-y-auto rounded-md border border-stone-200">
                <label className="flex items-center gap-2 border-b border-stone-100 bg-stone-50 px-3 py-2 text-xs text-stone-600">
                  <input type="checkbox" checked={fresh.length > 0 && fresh.every((id) => picked.includes(id))} onChange={(e) => setPicked(e.target.checked ? fresh : [])} /> Every invoice not sent yet ({fresh.length})
                </label>
                <ul className="divide-y divide-stone-100">
                  {rows.map((r) => {
                    const waiting = r.sent_status === "new" || r.sent_status === "accepted";
                    return (
                      <li key={r.id}>
                        <label className={`flex items-center gap-3 px-3 py-2 ${waiting ? "text-stone-400" : ""}`}>
                          <input type="checkbox" disabled={waiting} checked={picked.includes(r.id)} onChange={() => toggle(r.id)} />
                          <span className="w-28 font-mono">{r.number}</span>
                          <span className="w-24">{fmtDate(r.issue_date)}</span>
                          <span className="flex-1 text-right font-mono">{fmt(r.total)}</span>
                          <span className="w-28 text-right text-xs">{Number(r.balance_due) === 0 ? "Paid" : Number(r.balance_due) < Number(r.total) ? `${fmt(r.balance_due)} due` : "Unpaid"}</span>
                          <span className="w-28 text-right">{r.sent_status && <Badge tone={SENT[r.sent_status][1]}>{SENT[r.sent_status][0]}</Badge>}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <Field label="Message (optional)" hint="Shown with each invoice, for example: our invoices from before you joined MannaBooks.">
              <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
            </Field>
            <FormError error={send.error} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button loading={send.isPending} disabled={picked.length === 0} onClick={() => send.mutate()}>Send {picked.length || ""} {picked.length === 1 ? "invoice" : "invoices"}</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
