"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Paperclip } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, ErrorState, Field, FormError, PageHeader, Spinner, Textarea } from "@/components/ui";
import { REPORT_STATUS, type ReportSubmission, downloadFile, sendForm } from "@/lib/api/assets";
import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function SubmissionPage() {
  const { slug } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const path = { params: { path: { workspace: slug, id } } };
  const sub = useQuery({ queryKey: ["report-submission", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/report-submissions/{id}/", path)) });
  const [body, setBody] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const submit = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("body", body ?? sub.data?.body ?? "");
      if (file) form.append("file", file);
      return sendForm<ReportSubmission>(`/api/v1/w/${slug}/report-submissions/${id}/submit/`, form);
    },
    onSuccess: () => { toast.success("Report submitted"); setFile(null); },
  });
  const review = useMutation({
    mutationFn: async (decision: "accepted" | "returned") => unwrap(await api.POST("/api/v1/w/{workspace}/report-submissions/{id}/review/", { ...path, body: { decision, comment } })),
    onSuccess: (s) => toast.success(s.status === "accepted" ? "Accepted" : "Sent back"),
  });
  if (sub.isLoading) return <Spinner />;
  if (sub.error) return <ErrorState error={sub.error} />;
  const s = sub.data!;
  const get = (p: string, name: string) => downloadFile(p, name).catch((e) => toast.error(e.message));
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/work-reports`} className="text-sm text-stone-500 hover:underline">&larr; Work reports</Link>
      <PageHeader title={s.title} description={`${s.employee_name}${s.period_label ? `, ${s.period_label}` : ""}, due ${fmtDate(s.due_date)}. Asked by ${s.requested_by_name}.`} guide="work-reports" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={REPORT_STATUS[s.status ?? "pending"].tone}>{REPORT_STATUS[s.status ?? "pending"].label}</Badge>
        {s.submitted_at && <span className="text-sm text-stone-500">Submitted {fmtDate(s.submitted_at)}{s.submitted_late ? " (late)" : ""}</span>}
        {s.has_template && <Button variant="ghost" onClick={() => get(`/api/v1/w/${slug}/report-requests/${s.request_id}/template/`, "template")}><Download className="h-4 w-4" /> Template</Button>}
      </div>
      {s.instructions && <Card className="mb-4 p-4"><p className="text-xs font-semibold uppercase text-stone-500">What to include</p><p className="mt-1 whitespace-pre-line text-sm text-stone-700">{s.instructions}</p></Card>}
      {s.status === "returned" && s.review_comment && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800"><span className="font-medium">{s.reviewed_by_name} sent it back:</span> {s.review_comment}</p>}
      {s.can_submit ? (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}>
          <Field label="Your report"><Textarea rows={10} value={body ?? s.body ?? ""} onChange={(e) => setBody(e.target.value)} placeholder="Write it here, attach a file, or both." /></Field>
          <Field label="Attach a file (optional)" hint={s.has_file ? `Already attached: ${s.file_name}. Choose another to replace it.` : "PDF, Word, Excel, PowerPoint or a photo, up to 10 MB."}>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm" />
          </Field>
          <FormError error={submit.error} />
          <div className="flex justify-end"><Button type="submit" loading={submit.isPending}>Submit report</Button></div>
        </form>
      ) : (
        <Card className="space-y-3 p-4">
          {s.body ? <p className="whitespace-pre-line text-sm text-stone-800">{s.body}</p> : <p className="text-sm text-stone-500">{s.status === "pending" || s.status === "late" ? "Not submitted yet." : "No written report."}</p>}
          {s.has_file && <Button variant="secondary" onClick={() => get(`/api/v1/w/${slug}/report-submissions/${id}/file/`, s.file_name ?? "report")}><Paperclip className="h-4 w-4" /> {s.file_name}</Button>}
          {s.status === "accepted" && <p className="text-sm text-emerald-700">Accepted by {s.reviewed_by_name}{s.review_comment ? `: ${s.review_comment}` : ""}</p>}
        </Card>
      )}
      {s.can_review && (
        <Card className="mt-4 space-y-3 p-4">
          <h2 className="text-sm font-semibold">Review</h2>
          <Field label="Comment" hint="Needed if you send it back."><Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
          <FormError error={review.error} />
          <div className="flex justify-end gap-2"><Button variant="secondary" loading={review.isPending} onClick={() => review.mutate("returned")}>Send back</Button><Button loading={review.isPending} onClick={() => review.mutate("accepted")}>Accept</Button></div>
        </Card>
      )}
    </div>
  );
}
