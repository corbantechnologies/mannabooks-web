"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Smartphone, XCircle } from "lucide-react";
import { useState } from "react";

import { api, fieldError, unwrap } from "@/lib/api/client";
import type { MpesaTransaction } from "@/lib/api/types";
import { fmt } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

import { Button, Field, FormError, Input, Modal } from "./ui";

/** Waits for Safaricom's answer to a prompt (the API is told by callback; we poll it). */
export function usePromptStatus(slug: string, id: string | null) {
  return useQuery({
    queryKey: ["mpesa-tx", slug, id],
    enabled: Boolean(id),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/mpesa/transactions/{id}/", { params: { path: { workspace: slug, id: id! } } })),
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 3000 : false),
  });
}

/** Send an M-Pesa payment prompt to a customer's phone and wait for them to approve it. */
export function MpesaPromptModal({ open, onClose, amount, phone = "", invoiceId, reference, onPaid }: {
  open: boolean; onClose: () => void; amount: string; phone?: string; invoiceId?: string; reference?: string;
  onPaid?: (tx: MpesaTransaction) => void;
}) {
  const { slug } = useWorkspace();
  const [form, setForm] = useState({ phone, amount });
  const [txId, setTxId] = useState<string | null>(null);
  const send = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/mpesa/transactions/prompt/", {
      ...wsPath(slug), body: { phone: form.phone, amount: form.amount, invoice_id: invoiceId ?? null, reference: reference ?? "" },
    })),
    onSuccess: (tx) => setTxId(tx.id),
  });
  const status = usePromptStatus(slug, txId);
  const tx = status.data;
  const [reported, setReported] = useState<string | null>(null);
  if (tx?.status === "completed" && reported !== tx.id) {
    setReported(tx.id);
    onPaid?.(tx);
  }
  function close() {
    setTxId(null);
    send.reset();
    onClose();
  }
  return (
    <Modal open={open} title="Request M-Pesa payment" onClose={close}>
      {!txId ? (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
          <p className="text-sm text-stone-600">The customer gets a prompt on their phone and enters their M-Pesa PIN. The payment is recorded as soon as Safaricom confirms it.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone number" error={fieldError(send.error, "phone")}><Input required inputMode="tel" placeholder="0712 345 678" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} /></Field>
            <Field label="Amount" error={fieldError(send.error, "amount")} hint="Whole shillings."><Input required inputMode="numeric" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} /></Field>
          </div>
          <FormError error={send.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={close}>Cancel</Button><Button type="submit" loading={send.isPending}><Smartphone className="h-4 w-4" /> Send prompt</Button></div>
        </form>
      ) : (
        <div className="space-y-4 text-center">
          {(!tx || tx.status === "pending") && (
            <>
              <Smartphone className="mx-auto h-10 w-10 animate-pulse text-brand-700" />
              <p className="text-sm text-stone-700">Waiting for the customer to enter their PIN on {tx?.phone ?? form.phone}…</p>
            </>
          )}
          {tx?.status === "completed" && (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
              <p className="text-sm text-stone-700">Paid {fmt(tx.amount)} · M-Pesa code <span className="font-mono">{tx.mpesa_receipt}</span>{tx.payment_number ? ` · recorded as ${tx.payment_number}` : ""}</p>
            </>
          )}
          {(tx?.status === "failed" || tx?.status === "cancelled") && (
            <>
              <XCircle className="mx-auto h-10 w-10 text-red-600" />
              <p className="text-sm text-stone-700">{tx.status === "cancelled" ? "The customer cancelled or didn't answer." : "The payment failed."} {tx.result_description}</p>
              <Button variant="secondary" onClick={() => { setTxId(null); send.reset(); }}>Try again</Button>
            </>
          )}
          <div className="flex justify-end"><Button variant="secondary" onClick={close}>Close</Button></div>
        </div>
      )}
    </Modal>
  );
}
