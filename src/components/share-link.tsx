"use client";

import { useMutation } from "@tanstack/react-query";
import { Copy, MessageCircle } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { api, unwrap } from "@/lib/api/client";
import { useWorkspace, wsPath } from "@/lib/workspace";

import { Button, Field, FormError, Input, Modal, Select } from "./ui";

/** Make a private link the customer opens without signing in (an invoice, or their statement), and share it. */
export function ShareLinkModal({ open, onClose, customerId, invoiceId, label }: { open: boolean; onClose: () => void; customerId: string; invoiceId?: string; label: string }) {
  const { slug, context } = useWorkspace();
  const [days, setDays] = useState("30");
  const create = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/portal-links/", { ...wsPath(slug), body: { customer_id: customerId, invoice_id: invoiceId ?? null, days: Number(days) } })),
  });
  const url = create.data?.url;
  const message = `${label} from ${context.workspace.name}: ${url}`;
  function close() {
    create.reset();
    onClose();
  }
  return (
    <Modal open={open} title="Share with the customer" onClose={close}>
      {!url ? (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <p className="text-sm text-stone-600">The customer opens the link on their phone without signing in{invoiceId ? " to see the invoice" : " to see their statement and unpaid invoices"}, and can pay by M-Pesa if it is connected.</p>
          <Field label="Link works for">
            <Select value={days} onChange={(e) => setDays(e.target.value)}>
              <option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option>
            </Select>
          </Field>
          <FormError error={create.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={close}>Cancel</Button><Button type="submit" loading={create.isPending}>Create link</Button></div>
        </form>
      ) : (
        <div className="space-y-4">
          <Input readOnly value={url} onFocus={(e) => e.target.select()} />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(url).then(() => toast.success("Link copied"))}><Copy className="h-4 w-4" /> Copy link</Button>
            <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"><Button variant="secondary"><MessageCircle className="h-4 w-4" /> WhatsApp</Button></a>
            <a href={`sms:?&body=${encodeURIComponent(message)}`}><Button variant="secondary">SMS</Button></a>
          </div>
          <p className="text-xs text-stone-500">Anyone with the link can see it until it expires. Stop a link from the customer&apos;s page.</p>
          <div className="flex justify-end"><Button onClick={close}>Done</Button></div>
        </div>
      )}
    </Modal>
  );
}
