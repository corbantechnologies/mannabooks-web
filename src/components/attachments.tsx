"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CircleAlert, Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";

import { Badge, Card, Select } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { downloadFile, sendForm } from "@/lib/api/assets";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { ask } from "@/components/confirm";

export type AttachDoc = "invoice" | "payment" | "bill" | "payment_voucher" | "supplier_payment" | "expense" | "journal" | "register_item";

const KINDS = {
  sales: [["etims", "eTIMS invoice"], ["lpo", "LPO / purchase order"], ["delivery", "Proof of delivery"], ["contract", "Contract"],
    ["withholding", "Withholding certificate"], ["payment_proof", "Payment proof"], ["other", "Other"]],
  purchase: [["etims", "eTIMS invoice"], ["supplier_invoice", "Supplier invoice"], ["receipt", "Receipt"], ["payment_proof", "Payment proof"], ["other", "Other"]],
  register: [["contract", "Contract or policy"], ["supplier_invoice", "Supplier invoice"], ["receipt", "Receipt"], ["other", "Other"]],
} as const;
const EMAILED: AttachDoc[] = ["invoice", "payment", "supplier_payment"];

const size = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/**
 * Files on a financial document: the eTIMS invoice, payment proof, the supplier's invoice, the customer's LPO or
 * withholding certificate. Always optional. On documents that are emailed, a file can be marked to go with the email.
 * `missingEtims` shows a gentle reminder while the document has neither an eTIMS number nor an eTIMS file.
 */
export function Attachments({ docType, id, side, canAdd, missingEtims }: { docType: AttachDoc; id: string; side: "sales" | "purchase" | "register"; canAdd: boolean; missingEtims?: boolean }) {
  const { slug } = useWorkspace();
  const [kind, setKind] = useState<string>(side === "register" ? "contract" : "etims");
  const input = useRef<HTMLInputElement>(null);
  const q = useQuery({
    queryKey: ["attachments", slug, docType, id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/attachments/", { params: { path: { workspace: slug }, query: { document_type: docType, object_id: id } } })),
  });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("document_type", docType);
      form.append("object_id", id);
      form.append("kind", kind);
      form.append("for_customer", String(kind === "etims" && EMAILED.includes(docType) && side === "sales"));
      return sendForm(`/api/v1/w/${slug}/attachments/`, form);
    },
    onSuccess: () => { toast.success("File added"); void q.refetch(); }, onError: (e) => toast.error(e.message),
  });
  const patch = useMutation({
    mutationFn: async ({ aid, for_customer }: { aid: string; for_customer: boolean }) =>
      unwrap(await api.PATCH("/api/v1/w/{workspace}/attachments/{id}/", { params: { path: { workspace: slug, id: aid } }, body: { for_customer } as never })),
    onSuccess: () => void q.refetch(), onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (aid: string) => unwrap(await api.DELETE("/api/v1/w/{workspace}/attachments/{id}/", { params: { path: { workspace: slug, id: aid } } })),
    onSuccess: () => { toast.success("File removed"); void q.refetch(); }, onError: (e) => toast.error(e.message),
  });
  const files = q.data ?? [];
  const emailed = EMAILED.includes(docType);
  const showReminder = missingEtims && !files.some((f) => f.kind === "etims");
  if (q.isLoading || (!files.length && !canAdd && !showReminder)) return null;

  return (
    <Card className="mb-4 p-4 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-stone-900"><Paperclip className="h-4 w-4" /> Attachments{files.length ? ` (${files.length})` : ""}</h2>
        {canAdd && (
          <div className="flex flex-wrap items-center gap-2">
            <Select aria-label="What the file is" className="w-48 py-1.5 text-sm" value={kind} onChange={(e) => setKind(e.target.value)}>
              {KINDS[side].map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </Select>
            <input ref={input} type="file" className="hidden" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }} />
            <button type="button" disabled={upload.isPending} onClick={() => input.current?.click()}
              className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60">
              {upload.isPending ? "Uploading…" : "Add a file"}
            </button>
          </div>
        )}
      </div>
      {showReminder && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-800"><CircleAlert className="h-3.5 w-3.5" /> No eTIMS invoice yet: add its number or upload it. Optional, but some {side === "sales" ? "customers won't pay" : "VAT claims need it"} without it.</p>
      )}
      {files.length > 0 && (
        <ul className="mt-3 divide-y divide-stone-100">
          {files.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <Badge tone={f.kind === "etims" ? "green" : "stone"}>{f.kind_label}</Badge>
              <button type="button" className="min-w-0 truncate text-brand-700 hover:underline" onClick={() => void downloadFile(`/api/v1/w/${slug}/attachments/${f.id}/`, f.name).catch((e) => toast.error(e.message))}>{f.name}</button>
              <span className="text-xs text-stone-500">{size(f.size ?? 0)} · {f.added_by_name ?? "Someone"}, {fmtDate(f.created_at)}</span>
              <span className="ml-auto flex items-center gap-3">
                {emailed && canAdd && (
                  <label className="flex items-center gap-1.5 text-xs text-stone-600" title="Sent with the document when you email it">
                    <input type="checkbox" checked={!!f.for_customer} onChange={(e) => patch.mutate({ aid: f.id, for_customer: e.target.checked })} /> Send with email
                  </label>
                )}
                {canAdd && <button type="button" aria-label={`Remove ${f.name}`} className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-red-600"
                  onClick={() => void ask(`Remove ${f.name}? This is recorded in the audit log.`).then((ok) => ok && remove.mutate(f.id))}><X className="h-3.5 w-3.5" /></button>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {!files.length && canAdd && <p className="mt-2 text-xs text-stone-500">Optional: the eTIMS invoice, a receipt, the M-Pesa message or bank slip. On a phone you can take a photo.</p>}
    </Card>
  );
}
