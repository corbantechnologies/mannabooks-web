"use client";

import { useMutation } from "@tanstack/react-query";
import clsx from "clsx";
import { Check, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, Field, FormError, Modal, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { APPROVAL_STATUS, type ApprovalRequest, type DocType, useApprovalStatus } from "@/lib/api/control";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

/** The steps of a request: who approved each level, and where it is now. */
export function ApprovalChain({ req }: { req: ApprovalRequest }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {req.level_labels.map((label, i) => {
        const step = req.steps.find((s) => s.level === i);
        const done = step?.decision === "approved";
        const refused = step?.decision === "rejected";
        const current = req.status === "pending" && i === req.current_level;
        return (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-stone-300">&rarr;</span>}
            <span className={clsx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
              done && "border-emerald-200 bg-emerald-50 text-emerald-800", refused && "border-red-200 bg-red-50 text-red-700",
              current && "border-amber-300 bg-amber-50 text-amber-800", !done && !refused && !current && "border-stone-200 text-stone-500")}>
              {done && <Check className="h-3.5 w-3.5" />}{refused && <X className="h-3.5 w-3.5" />}
              {label}{step?.decided_by_name ? `: ${step.decided_by_name}` : ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function DecideModal({ req, decision, onClose }: { req: ApprovalRequest | null; decision: "approved" | "rejected"; onClose: () => void }) {
  const { slug } = useWorkspace();
  const [comment, setComment] = useState("");
  const decide = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/approvals/{id}/decide/", {
      params: { path: { workspace: slug, id: req!.id } }, body: { decision, comment },
    })),
    onSuccess: (r) => { toast.success(r.status === "approved" ? `${r.document_number} approved` : r.status === "rejected" ? "Sent back" : "Approved; passed to the next level"); setComment(""); onClose(); },
  });
  return (
    <Modal open={Boolean(req)} title={decision === "approved" ? `Approve ${req?.document_number}` : `Don't approve ${req?.document_number}`} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); decide.mutate(); }}>
        <p className="text-sm text-stone-600">{req?.document_label}: {req?.summary}</p>
        <Field label={decision === "approved" ? "Note (optional)" : "Why not? They'll see this"}>
          <Textarea rows={3} required={decision === "rejected"} value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        <FormError error={decide.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Back</Button>
          <Button type="submit" variant={decision === "approved" ? "primary" : "danger"} loading={decide.isPending}>{decision === "approved" ? "Approve" : "Don't approve"}</Button>
        </div>
      </form>
    </Modal>
  );
}

/** A document's approval chain: send it, follow it, and approve it from the document's own page. */
export function ApprovalPanel({ docType, id }: { docType: DocType; id: string }) {
  const { slug } = useWorkspace();
  const status = useApprovalStatus(slug, docType, id);
  const [deciding, setDeciding] = useState<"approved" | "rejected" | null>(null);
  const submit = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/approvals/", { params: { path: { workspace: slug } }, body: { document_type: docType, object_id: id } })),
    onSuccess: (r) => toast.success(`Sent to ${r.waiting_on.join(", ") || "the approvers"}`),
    onError: (e) => toast.error(e.message),
  });
  const cancel = useMutation({
    mutationFn: async (rid: string) => unwrap(await api.POST("/api/v1/w/{workspace}/approvals/{id}/cancel/", { params: { path: { workspace: slug, id: rid } } })),
    onSuccess: () => toast.success("Request withdrawn"),
    onError: (e) => toast.error(e.message),
  });
  const s = status.data;
  if (!s || (!s.required && !s.request)) return null;
  const req = s.request;
  const pending = req?.status === "pending";
  return (
    <Card className="mb-4 space-y-3 p-4 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-stone-900">Approval</h2>
          {req && <Badge tone={APPROVAL_STATUS[req.status ?? "pending"].tone}>{APPROVAL_STATUS[req.status ?? "pending"].label}</Badge>}
          {s.rule_name && !pending && <span className="text-xs text-stone-500">{s.rule_name}</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {pending && req!.can_decide && <>
            <Button variant="secondary" onClick={() => setDeciding("rejected")}>Don&apos;t approve</Button>
            <Button onClick={() => setDeciding("approved")}>Approve</Button>
          </>}
          {pending && req!.can_cancel && <Button variant="ghost" loading={cancel.isPending} onClick={() => confirm("Withdraw this request?") && cancel.mutate(req!.id)}>Withdraw</Button>}
          {s.can_submit && <Button loading={submit.isPending} onClick={() => submit.mutate()}>{req?.status === "rejected" ? "Send again" : "Send for approval"}</Button>}
        </div>
      </div>
      {req && (req.status !== "cancelled" || !s.can_submit) ? <ApprovalChain req={req} /> : (
        <p className="text-sm text-stone-600">This needs approval by: {s.levels.join(" then ")}.</p>
      )}
      {pending && <p className="text-sm text-stone-600">Waiting for {req!.waiting_on.join(", ") || "the owner"}. Sent by {req!.requested_by_name} on {fmtDate(req!.created_at)}.</p>}
      {req?.steps.filter((st) => st.comment).map((st) => (
        <p key={st.id} className={clsx("rounded-md px-3 py-2 text-sm", st.decision === "rejected" ? "bg-red-50 text-red-800" : "bg-stone-50 text-stone-700")}>
          <span className="font-medium">{st.decided_by_name}:</span> {st.comment}
        </p>
      ))}
      <DecideModal req={deciding ? req ?? null : null} decision={deciding ?? "approved"} onClose={() => setDeciding(null)} />
    </Card>
  );
}
