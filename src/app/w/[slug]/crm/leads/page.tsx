"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { ListFilters } from "@/components/doc-list";
import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td, Textarea } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { LEAD_SOURCES, LEAD_STATUS, useAssignees } from "@/lib/api/crm";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

const BLANK = { name: "", company: "", phone: "", email: "", source: "walk_in", interest: "", estimated_value: "", assigned_to_id: "", notes: "" };

export default function LeadsPage() {
  const { slug, can } = useWorkspace();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(BLANK);
  const assignees = useAssignees(slug);
  const list = useQuery({
    queryKey: ["leads", slug, search, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/leads/", {
      params: { path: { workspace: slug }, query: { search: search || undefined, status: (status || undefined) as never, page_size: 100 } },
    })),
  });
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/leads/", {
      ...wsPath(slug), body: { ...form, source: form.source as never, estimated_value: form.estimated_value || "0", assigned_to_id: form.assigned_to_id || null },
    })),
    onSuccess: (l) => { toast.success(`Lead ${l.number} added`); setAdding(false); setForm(BLANK); router.push(`/w/${slug}/crm/leads/${l.id}`); },
  });
  const set = (k: keyof typeof BLANK) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const rows = list.data?.results ?? [];
  return (
    <div className="w-full">
      <PageHeader title="Leads" description="People who might buy: walk-ins, calls, referrals. Follow them up, then convert the good ones into customers." guide="crm"
        actions={can("crm.manage") && <Button onClick={() => { save.reset(); setAdding(true); }}><Plus className="h-4 w-4" /> New lead</Button>} />
      <ListFilters search={search} setSearch={setSearch} status={status} setStatus={setStatus} placeholder="Search name, company or phone"
        statuses={Object.entries(LEAD_STATUS).map(([k, [l]]) => [k, l])} />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title={search || status ? "No leads match" : "No leads yet"}>Add the next person who asks about your products.</EmptyState>
        ) : (
          <Table head={["Lead", "Wants", "Source", "Value", "With", "Status", "Added"]}>
            {rows.map((l) => (
              <tr key={l.id} className="hover:bg-stone-50">
                <Td>
                  <Link href={`/w/${slug}/crm/leads/${l.id}`} className="font-medium hover:underline">{l.name}</Link>
                  <div className="text-xs text-stone-500">{[l.company, l.phone].filter(Boolean).join(" · ")}</div>
                </Td>
                <Td className="text-stone-600">{l.interest || "-"}</Td>
                <Td className="text-stone-600">{LEAD_SOURCES.find(([k]) => k === l.source)?.[1]}</Td>
                <Td className="text-right font-mono">{Number(l.estimated_value) ? fmt(l.estimated_value) : "-"}</Td>
                <Td className="text-stone-600">{l.assigned_to_name ?? "-"}</Td>
                <Td><Badge tone={LEAD_STATUS[l.status ?? "new"]?.[1]}>{LEAD_STATUS[l.status ?? "new"]?.[0]}</Badge>{l.open_tasks > 0 && <span className="ml-1 text-xs text-stone-500">{l.open_tasks} to do</span>}</Td>
                <Td className="text-stone-500">{fmtDate(l.created_at)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal size="lg" open={adding} title="New lead" onClose={() => setAdding(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" error={fieldError(save.error, "name")}><Input required value={form.name} onChange={set("name")} placeholder="Jane Wanjiku" /></Field>
            <Field label="Company (optional)"><Input value={form.company} onChange={set("company")} /></Field>
            <Field label="Phone" error={fieldError(save.error, "phone")}><Input value={form.phone} onChange={set("phone")} placeholder="0722 000 111" /></Field>
            <Field label="Email" error={fieldError(save.error, "email")}><Input type="email" value={form.email} onChange={set("email")} /></Field>
            <Field label="How they found you"><Select value={form.source} onChange={set("source")}>{LEAD_SOURCES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            <Field label="Likely value (optional)"><Input inputMode="decimal" value={form.estimated_value} onChange={set("estimated_value")} /></Field>
          </div>
          <Field label="What they want"><Input value={form.interest} onChange={set("interest")} placeholder="Cement and steel for a 4-storey block" /></Field>
          {assignees.length > 0 && (
            <Field label="Who follows up"><Select value={form.assigned_to_id} onChange={set("assigned_to_id")}><option value="">Nobody yet</option>{assignees.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
          )}
          <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={set("notes")} /></Field>
          <FormError error={save.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button type="submit" loading={save.isPending}>Add lead</Button></div>
        </form>
      </Modal>
    </div>
  );
}
