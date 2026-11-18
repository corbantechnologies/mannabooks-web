"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Paperclip, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";

import { ask } from "@/components/confirm";
import type { Task } from "@/components/task-form";
import { Button, Card, FormError, Input, Textarea } from "@/components/ui";
import { downloadFile, sendForm } from "@/lib/api/assets";
import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

/** The steps of a task, ticked off as they are done. */
export function TaskChecklist({ task, onChange }: { task: Task; onChange: () => void }) {
  const { slug } = useWorkspace();
  const [text, setText] = useState("");
  const path = () => ({ params: { path: { workspace: slug, id: task.id } } });
  const itemPath = (cid: number) => ({ params: { path: { workspace: slug, id: task.id, cid } } });
  const add = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/tasks/{id}/checklist/", { ...path(), body: { text } as never })),
    onSuccess: () => { setText(""); onChange(); },
  });
  const tick = useMutation({
    mutationFn: async ({ cid, done }: { cid: number; done: boolean }) =>
      unwrap(await api.PATCH("/api/v1/w/{workspace}/tasks/{id}/checklist/{cid}/", { ...itemPath(cid), body: { done } as never })),
    onSuccess: onChange, onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (cid: number) => unwrap(await api.DELETE("/api/v1/w/{workspace}/tasks/{id}/checklist/{cid}/", itemPath(cid))),
    onSuccess: onChange, onError: (e) => toast.error(e.message),
  });
  const items = task.checklist;
  if (!items.length && !task.can_edit_checklist) return null;
  const done = items.filter((i) => i.done).length;
  return (
    <Card className="space-y-2 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Checklist</h2>
        {items.length > 0 && <span className="text-xs text-stone-500">{done} of {items.length} done</span>}
      </div>
      {items.length > 0 && (
        <div className="h-1.5 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${(100 * done) / items.length}%` }} /></div>
      )}
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.id} className="group flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={i.done} disabled={!task.can_edit_checklist || tick.isPending}
              onChange={(e) => tick.mutate({ cid: i.id, done: e.target.checked })} aria-label={i.text} />
            <span className={i.done ? "flex-1 text-stone-400 line-through" : "flex-1 text-stone-800"}>{i.text}
              {i.done && i.done_by_name && <span className="ml-1 text-xs no-underline">({i.done_by_name})</span>}</span>
            {task.can_edit_checklist && (
              <button type="button" aria-label={`Remove ${i.text}`} onClick={() => remove.mutate(i.id)}
                className="rounded p-0.5 text-stone-300 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
            )}
          </li>
        ))}
      </ul>
      {task.can_edit_checklist && (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) add.mutate(); }}>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a step" aria-label="New step" />
          <Button type="submit" variant="secondary" loading={add.isPending}>Add</Button>
        </form>
      )}
      <FormError error={add.error} />
    </Card>
  );
}

/** Files on the task: the brief, drafts, the finished document. */
export function TaskFiles({ task }: { task: Task }) {
  const { slug } = useWorkspace();
  const input = useRef<HTMLInputElement>(null);
  const q = useQuery({
    queryKey: ["task-files", slug, task.id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/tasks/{id}/attachments/", { params: { path: { workspace: slug, id: task.id } } })),
  });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return sendForm(`/api/v1/w/${slug}/tasks/${task.id}/attachments/`, form);
    },
    onSuccess: () => { toast.success("File added"); void q.refetch(); }, onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (aid: number) => unwrap(await api.DELETE("/api/v1/w/{workspace}/tasks/{id}/attachments/{aid}/", { params: { path: { workspace: slug, id: task.id, aid } } })),
    onSuccess: () => void q.refetch(), onError: (e) => toast.error(e.message),
  });
  const files = q.data ?? [];
  return (
    <Card className="space-y-2 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Files</h2>
        <Button variant="ghost" loading={upload.isPending} onClick={() => input.current?.click()}><Upload className="h-4 w-4" /> Add a file</Button>
        <input ref={input} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }} />
      </div>
      {files.length === 0 ? <p className="text-sm text-stone-500">None yet. PDF, Word, Excel, PowerPoint or a photo, up to 10 MB.</p> : (
        <ul className="divide-y divide-stone-100">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 py-1.5 text-sm">
              <Paperclip className="h-4 w-4 shrink-0 text-stone-400" />
              <button type="button" className="min-w-0 flex-1 truncate text-left text-brand-700 hover:underline"
                onClick={() => downloadFile(`/api/v1/w/${slug}/tasks/${task.id}/attachments/${f.id}/`, f.name).catch((e) => toast.error(e.message))}>{f.name}</button>
              <span className="whitespace-nowrap text-xs text-stone-500">{f.added_by_name} · {fmtDate(f.created_at)}</span>
              <button type="button" aria-label={`Remove ${f.name}`} className="rounded p-0.5 text-stone-300 hover:text-red-600"
                onClick={() => void ask(`Remove ${f.name}?`).then((ok) => ok && remove.mutate(f.id))}><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** The conversation on a task. Whoever gave it and whoever does it are emailed about each comment. */
export function TaskComments({ task }: { task: Task }) {
  const { slug } = useWorkspace();
  const [body, setBody] = useState("");
  const path = { params: { path: { workspace: slug, id: task.id } } };
  const q = useQuery({ queryKey: ["task-comments", slug, task.id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/tasks/{id}/comments/", path)) });
  const post = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/tasks/{id}/comments/", { ...path, body: { body } as never })),
    onSuccess: () => { setBody(""); void q.refetch(); },
  });
  const rows = q.data ?? [];
  return (
    <Card className="space-y-3 p-4">
      <h2 className="text-sm font-semibold">Comments</h2>
      {rows.length === 0 && <p className="text-sm text-stone-500">No comments yet. Ask a question or give an update here.</p>}
      <ul className="space-y-3">
        {rows.map((c) => (
          <li key={c.id} className="text-sm">
            <p className="text-xs text-stone-500"><span className="font-medium text-stone-700">{c.author_name}</span> · {fmtDate(c.created_at)}</p>
            <p className="whitespace-pre-line text-stone-800">{c.body}</p>
          </li>
        ))}
      </ul>
      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (body.trim()) post.mutate(); }}>
        <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a comment" aria-label="Comment" />
        <FormError error={post.error} />
        <div className="flex justify-end"><Button type="submit" variant="secondary" loading={post.isPending}>Comment</Button></div>
      </form>
    </Card>
  );
}
