"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { ActionMenu } from "@/components/action-menu";
import { Attachments } from "@/components/attachments";
import { ask } from "@/components/confirm";
import { AskAccess } from "@/components/register-ask";
import { Badge, Button, Card, ErrorState, FormError, Input, PageHeader, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

/** One item in a register: its cost and renewal, who is responsible, who uses it, its own fields, files, and requests for access. */
export default function RegisterItemPage() {
  const { id } = useParams<{ id: string }>();
  const { slug, can } = useWorkspace();
  const router = useRouter();
  const qc = useQueryClient();
  const key = ["register-item", slug, id];
  const q = useQuery({ queryKey: key, queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/registers/items/{id}/", { params: { path: { workspace: slug, id } } })) });
  const regs = useQuery({ queryKey: ["registers", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/registers/", wsPath(slug))) });
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const decide = useMutation({
    mutationFn: async (v: { id: string; approve: boolean }) => unwrap(await api.POST("/api/v1/w/{workspace}/registers/requests/{id}/decide/", {
      params: { path: { workspace: slug, id: v.id } }, body: { approve: v.approve, note },
    })),
    onSuccess: (r, v) => { qc.setQueryData(key, r); setNote(""); toast.success(v.approve ? "Access given" : "Declined"); void qc.invalidateQueries({ queryKey: ["register-requests", slug] }); },
  });
  const remove = useMutation({
    mutationFn: async () => { await api.DELETE("/api/v1/w/{workspace}/registers/items/{id}/", { params: { path: { workspace: slug, id } } }); },
    onSuccess: () => router.push(`/w/${slug}/registers`),
  });
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} />;
  const i = q.data;
  const reg = regs.data?.find((r) => r.id === i.register_id);
  const overdue = i.renews_in_days !== null && i.renews_in_days < 0;
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/registers?register=${i.register_id}`} className="text-sm text-stone-500 hover:underline">&larr; {i.register_name}</Link>
      <PageHeader title={i.name} guide="registers"
        description={<>{i.register_name}{i.supplier_name ? ` · from ${i.supplier_name}` : ""}{i.owner_name ? ` · ${i.owner_name} is responsible` : ""}</>}
        actions={
          <div className="flex flex-wrap gap-2">
            {i.can_manage && <Link href={`/w/${slug}/registers/items/${i.id}/edit`}><Button><Pencil className="h-4 w-4" /> Change</Button></Link>}
            {!i.i_use_it && !i.i_asked && i.status === "active" && <Button variant="secondary" onClick={() => setAsking(true)}>Ask for access</Button>}
            {can("registers.manage") && <ActionMenu actions={[{ label: "Delete it", danger: true,
              onClick: () => void ask(`Delete ${i.name}? To keep its record, set it to Ended instead.`, { confirmLabel: "Delete", danger: true }).then((ok) => ok && remove.mutate()) }]} />}
          </div>
        } />
      <div className="mb-4 flex flex-wrap gap-2">
        {i.status === "ended" && <Badge tone="stone">Ended</Badge>}
        {i.i_use_it && <Badge tone="green">You have access</Badge>}
        {i.i_asked && <Badge tone="amber">You&apos;ve asked for access</Badge>}
        {overdue && <Badge tone="red">Renewal overdue</Badge>}
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {i.money_shown && <Card className="p-3"><p className="text-xs text-stone-500">Costs</p><p className="font-mono text-lg">{fmt(i.cost)} <span className="text-sm text-stone-500">{i.cost_cycle_label.toLowerCase()}</span></p>
          {i.cost_cycle !== "one_off" && <p className="text-xs text-stone-500">{fmt(i.monthly_cost)} a month</p>}</Card>}
        <Card className="p-3"><p className="text-xs text-stone-500">{i.auto_renews ? "Renews" : "Expires"}</p>
          <p className={overdue ? "text-lg text-red-700" : "text-lg"}>{i.renewal_date ? fmtDate(i.renewal_date) : "-"}</p>
          {i.renews_in_days !== null && <p className="text-xs text-stone-500">{overdue ? `${-i.renews_in_days} days ago` : `in ${i.renews_in_days} days`} · reminded {i.remind_days} days before</p>}</Card>
        <Card className="p-3"><p className="text-xs text-stone-500">Used by</p><p className="text-lg">{i.users.length} {i.users.length === 1 ? "person" : "people"}</p>
          {i.seats !== null && <p className={i.seats_used >= i.seats ? "text-xs text-amber-700" : "text-xs text-stone-500"}>{i.seats_used} of {i.seats} seats</p>}</Card>
        {i.money_shown && i.cost_center_name && <Card className="p-3"><p className="text-xs text-stone-500">Cost centre</p><p className="text-lg">{i.cost_center_name}</p></Card>}
      </div>
      {i.requests.length > 0 && (
        <Card className="mb-4 space-y-2 border-amber-300 p-4">
          <h2 className="text-sm font-semibold">Asking for access</h2>
          {i.requests.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{r.name}</span><span className="text-stone-600">{r.reason}</span>
              <span className="ml-auto flex flex-wrap items-center gap-2">
                <Input className="w-48" placeholder="Note (needed to decline)" value={note} onChange={(e) => setNote(e.target.value)} />
                <Button variant="secondary" loading={decide.isPending && decide.variables?.approve === false} onClick={() => decide.mutate({ id: r.id, approve: false })}>Decline</Button>
                <Button loading={decide.isPending && decide.variables?.approve === true} onClick={() => decide.mutate({ id: r.id, approve: true })}>Give access</Button>
              </span>
            </div>
          ))}
          <FormError error={decide.error} />
        </Card>
      )}
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold">Who uses it</h2>
          <p className="text-sm"><span className="text-stone-500">Departments:</span> {i.departments.map((d) => d.name).join(", ") || "-"}</p>
          <p className="mt-1 text-sm"><span className="text-stone-500">People:</span> {i.users.map((u) => u.name).join(", ") || "-"}</p>
        </Card>
        {(reg?.fields?.length ?? 0) > 0 && (
          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold">Details</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {(reg?.fields ?? []).map((f) => (
                <div key={f.key} className="contents"><dt className="text-stone-500">{f.label}</dt>
                  <dd>{i.values[f.key ?? ""] ? (f.kind === "date" ? fmtDate(i.values[f.key ?? ""]) : i.values[f.key ?? ""]) : "-"}</dd></div>
              ))}
            </dl>
          </Card>
        )}
      </div>
      {i.notes && <Card className="mb-4 p-4"><h2 className="mb-1 text-sm font-semibold">Notes</h2><p className="whitespace-pre-line text-sm">{i.notes}</p></Card>}
      {i.money_shown && <Attachments docType="register_item" id={i.id} side="register" canAdd={can("registers.manage")} />}
      {asking && <AskAccess item={i} onClose={() => setAsking(false)} />}
    </div>
  );
}
