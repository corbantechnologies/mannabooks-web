"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, Field, FormError, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { REPORT_FREQUENCIES, type ReportRequest, sendForm } from "@/lib/api/assets";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { useWorkspace } from "@/lib/workspace";

export default function NewWorkReportPage() {
  const { slug, can, context } = useWorkspace();
  const router = useRouter();
  const task = useSearchParams().get("kind") === "task";
  const manage = can("workreports.manage");
  // admins can set a request up for someone else (the CEO, a manager): it is then theirs
  const members = useQuery({
    queryKey: ["members", slug, "active"], retry: false,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/members/", { params: { path: { workspace: slug }, query: { status: "active", page_size: 200 } as never } })),
  });
  const [forId, setForId] = useState("");
  const [copyTo, setCopyTo] = useState<string[]>([]);
  const forOther = Boolean(forId) && forId !== context.membership_id;
  const forName = (members.data?.results ?? []).find((m) => m.id === forId)?.user.full_name ?? "them";
  const people = useQuery({ queryKey: ["report-people", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/report-requests/people/", { params: { path: { workspace: slug } } })) });
  const departments = useQuery({ queryKey: ["departments", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/departments/", { params: { path: { workspace: slug } } })) });
  const [f, setF] = useState({ kind: task ? "task" : "report", priority: "normal", due_time: "", title: "", instructions: "", audience: "team", department_id: "",
    frequency: "weekly", first_due_date: "", remind_days_before: "1" });
  const isTask = f.kind === "task";
  const [chosen, setChosen] = useState<string[]>([]);
  const [template, setTemplate] = useState<File | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const save = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      Object.entries(f).forEach(([k, v]) => { if (v !== "" && !(k === "department_id" && f.audience !== "department")) form.append(k, v); });
      if (f.audience === "people") chosen.forEach((id) => form.append("people_ids", id));
      if (template) form.append("template_file", template);
      if (forOther) form.append("requested_for_membership_id", forId);
      copyTo.forEach((id) => form.append("copy_to_membership_ids", id));
      return sendForm<ReportRequest>(`/api/v1/w/${slug}/report-requests/`, form);
    },
    onSuccess: (r) => { toast.success(`Asked ${r.assignee_names.length} ${r.assignee_names.length === 1 ? "person" : "people"}`); router.push(`/w/${slug}/work-reports/requests/${r.id}`); },
  });
  const list = people.data ?? [];
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/work-reports`} className="text-sm text-stone-500 hover:underline">&larr; Work reports</Link>
      <PageHeader title={isTask ? "A repeating task" : "Ask for a report"} guide="work-reports"
        description={isTask ? "People get an email and a reminder, can mark it in progress, then done. You are told when it is done or late." : "People get an email, a reminder before it is due, and you are told when it comes in or is late."} />
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Card className="space-y-3 p-4">
          <div className="flex gap-1 rounded-md bg-stone-100 p-1 text-sm">
            {[{ v: "report", l: "A report to write" }, { v: "task", l: "A repeating task" }].map((o) => (
              <button key={o.v} type="button" onClick={() => setF((p) => ({ ...p, kind: o.v }))}
                className={`flex-1 rounded px-3 py-1.5 ${f.kind === o.v ? "bg-white font-medium shadow-sm" : "text-stone-600"}`}>{o.l}</button>
            ))}
          </div>
          {isTask && <p className="text-xs text-stone-500">For a task that repeats (every day, week or month) or goes to a whole team. For a one-off task, use <Link className="underline" href={`/w/${slug}/tasks`}>Tasks</Link>.</p>}
          <Field label={isTask ? "Task" : "Report"} error={fieldError(save.error, "title")}><Input required value={f.title} onChange={set("title")} placeholder={isTask ? "Collect the signed lease from the landlord" : "Weekly sales and visits"} /></Field>
          <Field label={isTask ? "Details" : "What to include"}><Textarea rows={4} value={f.instructions} onChange={set("instructions")} placeholder={isTask ? "Where, who to see, what done looks like." : "Sales by customer, shops visited, orders expected next week, problems."} /></Field>
          {isTask && <Field label="Priority"><Select value={f.priority} onChange={set("priority")}><option value="normal">Normal</option><option value="high">High</option><option value="low">Low</option></Select></Field>}
          {!isTask && <Field label="Template (optional)" hint="A form people download, fill and upload back. PDF, Word, Excel up to 10 MB.">
            <input type="file" onChange={(e) => setTemplate(e.target.files?.[0] ?? null)} className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm" />
          </Field>}
        </Card>
        <Card className="space-y-3 p-4">
          {manage && (members.data?.results ?? []).length > 1 && (
            <Field label="Who it's for" hint={forOther ? `${forName} receives and reviews the reports. You are shown as having set it up.` : "Set it up for someone else, such as the CEO, and the reports go to them."}>
              <Select value={forId || context.membership_id} onChange={(e) => setForId(e.target.value)}>
                {(members.data?.results ?? []).map((m) => <option key={m.id} value={m.id}>{m.id === context.membership_id ? `Me (${m.user.full_name})` : m.user.full_name}</option>)}
              </Select>
            </Field>
          )}
          {(members.data?.results ?? []).length > 1 && (
            <Field label="Also goes to (optional)" hint="They get every report and overdue note too, and can review them. For example you and the CEO.">
              <div className="flex max-h-40 flex-wrap gap-x-4 gap-y-1 overflow-y-auto rounded-md border border-stone-200 p-2">
                {(members.data?.results ?? []).filter((m) => m.id !== (forId || context.membership_id)).map((m) => (
                  <label key={m.id} className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" checked={copyTo.includes(m.id)} onChange={(e) => setCopyTo((c) => (e.target.checked ? [...c, m.id] : c.filter((x) => x !== m.id)))} />
                    {m.user.full_name}
                  </label>
                ))}
              </div>
            </Field>
          )}
          <Field label="Who"><Select value={f.audience} onChange={set("audience")}>
            <option value="team">{forOther ? `Everyone who reports to ${forName}` : "Everyone who reports to me"}</option><option value="department">A department</option><option value="people">People I choose</option></Select></Field>
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
          {f.audience === "team" && <p className="text-xs text-stone-500">{forOther ? `Everyone in ${forName}'s reporting line, from "Reports to" on employee records.` : list.length ? `${list.length} people can be asked.` : "Nobody reports to you yet."}</p>}
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="How often"><Select value={f.frequency} onChange={set("frequency")}>{REPORT_FREQUENCIES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</Select></Field>
            <Field label={f.frequency === "once" ? "Due on" : "First due on"} error={fieldError(save.error, "first_due_date")}><Input type="date" required value={f.first_due_date} onChange={set("first_due_date")} /></Field>
            <Field label="By (time)" hint="Blank: by the end of the day." error={fieldError(save.error, "due_time")}><Input type="time" value={f.due_time} onChange={set("due_time")} /></Field>
            <Field label="Remind (days before)"><Input type="number" min="0" max="14" value={f.remind_days_before} onChange={set("remind_days_before")} /></Field>
          </div>
        </Card>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button><Button type="submit" loading={save.isPending}>{isTask ? "Give the task" : "Send the request"}</Button></div>
      </form>
    </div>
  );
}
