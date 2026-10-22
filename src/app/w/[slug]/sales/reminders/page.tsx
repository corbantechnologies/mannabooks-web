"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, Field, FormError, Input, Modal, PageHeader, Spinner, Table, Td, Textarea } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import type { ReminderRule } from "@/lib/api/types";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

const when = (days: number) => (days < 0 ? `${-days} days before due` : days === 0 ? "On the due date" : `${days} days overdue`);

export default function RemindersPage() {
  const { slug, can } = useWorkspace();
  const manage = can("reminders.manage");
  const rules = useQuery({ queryKey: ["reminder-rules", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/reminders/rules/", { params: { path: { workspace: slug } } })) });
  const sent = useQuery({ queryKey: ["reminders-sent", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/reminders/sent/", { params: { path: { workspace: slug } } })) });
  const [editing, setEditing] = useState<ReminderRule | null>(null);
  const [form, setForm] = useState({ name: "", days: 0, subject: "", message: "" });
  const toggle = useMutation({
    mutationFn: async (r: ReminderRule) => unwrap(await api.PATCH("/api/v1/w/{workspace}/reminders/rules/{id}/", { params: { path: { workspace: slug, id: r.id } }, body: { is_active: !r.is_active } })),
    onSuccess: (r) => toast.success(r.is_active ? `${r.name}: on` : `${r.name}: off`),
  });
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PATCH("/api/v1/w/{workspace}/reminders/rules/{id}/", { params: { path: { workspace: slug, id: editing!.id } }, body: form })),
    onSuccess: () => { toast.success("Reminder saved"); setEditing(null); },
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment reminders"
        description="Emails sent each morning to customers with unpaid invoices. Switch on the ones you want; customers need an email address."
        guide="reminders"
      />
      <Card>
        {rules.isLoading ? <div className="px-4"><Spinner /></div> : (
          <Table head={["Reminder", "When", "Subject", "On"]}>
            {(rules.data?.results ?? []).map((r) => (
              <tr key={r.id} className={manage ? "cursor-pointer hover:bg-stone-50" : ""} onClick={() => { if (!manage) return; save.reset(); setForm({ name: r.name, days: r.days, subject: r.subject ?? "", message: r.message ?? "" }); setEditing(r); }}>
                <Td className="font-medium">{r.name}</Td>
                <Td>{when(r.days)}</Td>
                <Td className="text-stone-500">{r.subject}</Td>
                <Td>
                  <input type="checkbox" aria-label={`Send ${r.name}`} disabled={!manage || toggle.isPending} checked={r.is_active ?? false}
                    onClick={(e) => e.stopPropagation()} onChange={() => toggle.mutate(r)} />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <div>
        <h2 className="mb-2 text-sm font-semibold">Sent</h2>
        <Card>
          {(sent.data?.results ?? []).length === 0 ? <EmptyState title="No reminders sent yet" /> : (
            <Table head={["Date", "Invoice", "Customer", "To", "Reminder"]}>
              {sent.data!.results.map((s) => (
                <tr key={s.id}>
                  <Td className="whitespace-nowrap">{fmtDate(s.created_at)}</Td>
                  <Td><Link href={`/w/${slug}/sales/invoices/${s.invoice_id}`} className="font-mono text-xs hover:underline">{s.invoice_number}</Link></Td>
                  <Td>{s.customer_name}</Td>
                  <Td>{s.sent_to} {s.error && <Badge tone="red">Failed</Badge>}</Td>
                  <Td className="text-stone-500">{s.rule_name ?? "Sent by hand"}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
      <Modal open={editing !== null} title={editing?.name ?? ""} onClose={() => setEditing(null)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" error={fieldError(save.error, "name")}><Input required value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} /></Field>
            <Field label="Days from the due date" hint="-3 before, 0 on the day, 7 after." error={fieldError(save.error, "days")}>
              <Input type="number" value={form.days} onChange={(e) => setForm((prev) => ({ ...prev, days: Number(e.target.value) }))} />
            </Field>
          </div>
          <Field label="Subject" error={fieldError(save.error, "subject")}><Input required value={form.subject} onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))} /></Field>
          <Field label="Message" error={fieldError(save.error, "message")} hint="You can use {customer}, {number}, {balance}, {currency}, {due_date} and {business}.">
            <Textarea rows={8} value={form.message} onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))} />
          </Field>
          <FormError error={save.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
        </form>
      </Modal>
    </div>
  );
}
