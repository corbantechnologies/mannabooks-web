"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { REPORT_FREQUENCIES, REPORT_STATUS, downloadFile } from "@/lib/api/assets";
import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function ReportRequestPage() {
  const { slug } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const path = { params: { path: { workspace: slug, id } } };
  const req = useQuery({ queryKey: ["report-request", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/report-requests/{id}/", path)) });
  const subs = useQuery({
    queryKey: ["report-submissions", slug, "request", id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/report-submissions/", { params: { path: { workspace: slug }, query: { request: id, box: "all", page_size: 500 } } })),
  });
  const update = useMutation({
    mutationFn: async (status: "active" | "closed") => unwrap(await api.PATCH("/api/v1/w/{workspace}/report-requests/{id}/", { ...path, body: { status } })),
    onSuccess: (r) => toast.success(r.status === "closed" ? "Request closed: no more rounds" : "Request reopened"),
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/w/{workspace}/report-requests/{id}/", path)),
    onSuccess: () => { toast.success("Request deleted"); router.replace(`/w/${slug}/work-reports`); },
    onError: (e) => toast.error(e.message),
  });
  if (req.isLoading) return <Spinner />;
  if (req.error) return <ErrorState error={req.error} />;
  const r = req.data!;
  const rounds = new Map<string, NonNullable<typeof subs.data>["results"]>();
  for (const s of subs.data?.results ?? []) rounds.set(s.due_date, [...(rounds.get(s.due_date) ?? []), s]);
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/work-reports`} className="text-sm text-stone-500 hover:underline">&larr; Work reports</Link>
      <PageHeader title={r.title} description={`${REPORT_FREQUENCIES.find((f) => f.value === r.frequency)?.label}, from ${r.assignee_names.join(", ")}`} guide="work-reports"
        actions={<div className="flex flex-wrap gap-2">
          {r.has_template && <Button variant="secondary" onClick={() => downloadFile(`/api/v1/w/${slug}/report-requests/${id}/template/`, r.template_name ?? "template").catch((e) => toast.error(e.message))}><Download className="h-4 w-4" /> Template</Button>}
          <Button variant="ghost" className="text-red-600" onClick={() => confirm("Delete this request?") && remove.mutate()}>Delete</Button>
          {r.status === "active" ? <Button variant="secondary" onClick={() => update.mutate("closed")}>Close</Button> : <Button variant="secondary" onClick={() => update.mutate("active")}>Reopen</Button>}
        </div>} />
      {r.instructions && <Card className="mb-4 p-4"><p className="whitespace-pre-line text-sm text-stone-700">{r.instructions}</p></Card>}
      {subs.isLoading ? <Spinner /> : rounds.size === 0 ? <Card><EmptyState title="No rounds yet" /></Card> : [...rounds.entries()].map(([due, list]) => (
        <div key={due} className="mb-4">
          <h2 className="mb-2 text-sm font-semibold">Due {fmtDate(due)}{list[0]?.period_label ? `, ${list[0].period_label}` : ""}</h2>
          <Card>
            <Table head={["Person", "Status", "Submitted", ""]}>
              {list.map((s) => (
                <tr key={s.id} className="hover:bg-stone-50">
                  <Td>{s.employee_name}</Td>
                  <Td><Badge tone={REPORT_STATUS[s.status ?? "pending"].tone}>{REPORT_STATUS[s.status ?? "pending"].label}</Badge>{s.submitted_late && <span className="ml-1 text-xs text-red-700">late</span>}</Td>
                  <Td className="text-xs">{s.submitted_at ? fmtDate(s.submitted_at) : "-"}</Td>
                  <Td className="text-right"><Link href={`/w/${slug}/work-reports/submissions/${s.id}`}><Button variant="ghost">{s.can_review ? "Review" : "Open"}</Button></Link></Td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      ))}
    </div>
  );
}
