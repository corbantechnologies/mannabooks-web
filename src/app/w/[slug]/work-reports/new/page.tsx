"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, Field, FormError, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { REPORT_FREQUENCIES, type ReportRequest, sendForm } from "@/lib/api/assets";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { useWorkspace } from "@/lib/workspace";

export default function NewWorkReportPage() {
  const { slug } = useWorkspace();
  const router = useRouter();
  const people = useQuery({ queryKey: ["report-people", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/report-requests/people/", { params: { path: { workspace: slug } } })) });
  const departments = useQuery({ queryKey: ["departments", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/departments/", { params: { path: { workspace: slug } } })) });
  const [f, setF] = useState({ title: "", instructions: "", audience: "team", department_id: "", frequency: "weekly", first_due_date: "", remind_days_before: "1" });
  const [chosen, setChosen] = useState<string[]>([]);
  const [template, setTemplate] = useState<File | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const save = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      Object.entries(f).forEach(([k, v]) => { if (v !== "" && !(k === "department_id" && f.audience !== "department")) form.append(k, v); });
      if (f.audience === "people") chosen.forEach((id) => form.append("people_ids", id));
      if (template) form.append("template_file", template);
      return sendForm<ReportRequest>(`/api/v1/w/${slug}/report-requests/`, form);
    },
    onSuccess: (r) => { toast.success(`Asked ${r.assignee_names.length} ${r.assignee_names.length === 1 ? "person" : "people"}`); router.push(`/w/${slug}/work-reports/requests/${r.id}`); },
  });
  const list = people.data ?? [];
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/work-reports`} className="text-sm text-stone-500 hover:underline">&larr; Work reports</Link>
      <PageHeader title="Ask for a report" guide="work-reports" description="People get an email, a reminder before it is due, and you are told when it comes in or is late." />
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Card className="space-y-3 p-4">
          <Field label="Report" error={fieldError(save.error, "title")}><Input required value={f.title} onChange={set("title")} placeholder="Weekly sales and visits" /></Field>
          <Field label="What to include"><Textarea rows={4} value={f.instructions} onChange={set("instructions")} placeholder="Sales by customer, shops visited, orders expected next week, problems." /></Field>
          <Field label="Template (optional)" hint="A form people download, fill and upload back. PDF, Word, Excel up to 10 MB.">
            <input type="file" onChange={(e) => setTemplate(e.target.files?.[0] ?? null)} className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm" />
          </Field>
        </Card>
        <Card className="space-y-3 p-4">
          <Field label="Who"><Select value={f.audience} onChange={set("audience")}>
            <option value="team">Everyone who reports to me</option><option value="department">A department</option><option value="people">People I choose</option></Select></Field>
          {f.audience === "department" && <Field label="Department"><Select required value={f.department_id} onChange={set("department_id")}><option value="">Choose</option>{(departments.data?.results ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>}
          {f.audience === "people" && (
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-stone-200 p-2">
              {list.length === 0 && <p className="text-sm text-stone-500">Nobody reports to you yet. Set &quot;Reports to&quot; on employee records.</p>}
              {list.map((p) => (
                <label key={p.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-stone-50">
                  <input type="checkbox" checked={chosen.includes(p.id)} onChange={(e) => setChosen((c) => (e.target.checked ? [...c, p.id] : c.filter((x) => x !== p.id)))} />
                  {p.full_name}<span className="text-xs text-stone-500">{[p.job_title, p.department_name].filter(Boolean).join(", ")}</span>
                </label>
              ))}
            </div>
          )}
          {f.audience === "team" && <p className="text-xs text-stone-500">{list.length ? `${list.length} people can be asked.` : "Nobody reports to you yet."}</p>}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="How often"><Select value={f.frequency} onChange={set("frequency")}>{REPORT_FREQUENCIES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</Select></Field>
            <Field label={f.frequency === "once" ? "Due on" : "First due on"} error={fieldError(save.error, "first_due_date")}><Input type="date" required value={f.first_due_date} onChange={set("first_due_date")} /></Field>
            <Field label="Remind (days before)"><Input type="number" min="0" max="14" value={f.remind_days_before} onChange={set("remind_days_before")} /></Field>
          </div>
        </Card>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button><Button type="submit" loading={save.isPending}>Send the request</Button></div>
      </form>
    </div>
  );
}
