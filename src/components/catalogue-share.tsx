"use client";

import { useMutation } from "@tanstack/react-query";
import { Copy, ExternalLink, Mail, MessageCircle } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { api, unwrap } from "@/lib/api/client";
import type { Catalogue } from "@/lib/api/types";
import { useWorkspace } from "@/lib/workspace";

import { Button, Field, FormError, Input, Modal, Textarea } from "./ui";

/** Share a catalogue's link: copy it, WhatsApp, SMS, or email it from MannaBooks. */
export function CatalogueShare({ catalogue, open, onClose }: { catalogue: Catalogue; open: boolean; onClose: () => void }) {
  const { slug, context } = useWorkspace();
  const business = context.workspace.name;
  const [to, setTo] = useState("");
  const [message, setMessage] = useState(
    `Hello${catalogue.customer_name ? ` ${catalogue.customer_name}` : ""},\n\nHere is our ${catalogue.name.toLowerCase()} catalogue. Pick what you need and the quantities, and you will get your quotation straight away.\n\nKind regards,\n${business}`);
  const send = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/catalogues/{id}/send/", {
      params: { path: { workspace: slug, id: catalogue.id } },
      body: { to: to.split(/[,;\s]+/).filter(Boolean), message },
    })),
    onSuccess: () => { toast.success("Catalogue emailed"); onClose(); },
  });
  const text = `${catalogue.name} from ${business}: ${catalogue.url}`;
  return (
    <Modal open={open} title="Share the catalogue" onClose={onClose}>
      <div className="space-y-4">
        <Input readOnly value={catalogue.url} onFocus={(e) => e.target.select()} />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigator.clipboard.writeText(catalogue.url).then(() => toast.success("Link copied"))}><Copy className="h-4 w-4" /> Copy link</Button>
          <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><Button variant="secondary"><MessageCircle className="h-4 w-4" /> WhatsApp</Button></a>
          <a href={`sms:?&body=${encodeURIComponent(text)}`}><Button variant="secondary">SMS</Button></a>
          <a href={catalogue.url} target="_blank" rel="noreferrer"><Button variant="ghost"><ExternalLink className="h-4 w-4" /> Preview</Button></a>
        </div>
        <form className="space-y-3 border-t border-stone-100 pt-4" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
          <p className="flex items-center gap-2 text-sm font-medium"><Mail className="h-4 w-4" /> Email it</p>
          {context.pdf_enabled && <p className="text-xs text-stone-500">The catalogue goes as a PDF attachment too, with the link and a QR code in it.</p>}
          <Field label="To"><Input required type="text" value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@example.com" /></Field>
          <Field label="Message"><Textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
          <FormError error={send.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Close</Button><Button type="submit" loading={send.isPending}>Send email</Button></div>
        </form>
      </div>
    </Modal>
  );
}
