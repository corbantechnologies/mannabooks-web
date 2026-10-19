"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Meta } from "@/components/document-view";
import { ProjectForm } from "@/components/project-form";
import { Badge, Button, Card, EmptyState, ErrorState, Modal, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { PROJECT_STATUS } from "@/lib/api/control";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "red" | "green" }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className={clsx("mt-1 font-mono text-xl font-semibold", tone === "red" && "text-red-700", tone === "green" && "text-emerald-700")}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
    </Card>
  );
}

export default function ProjectPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const path = { params: { path: { workspace: slug, id } } };
  const [editing, setEditing] = useState(false);
  const project = useQuery({ queryKey: ["project", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/projects/{id}/", path)) });
  const summary = useQuery({ queryKey: ["project-summary", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/projects/{id}/summary/", path)), enabled: can("projects.view") });
  const remove = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/w/{workspace}/projects/{id}/", path)),
    onSuccess: () => { toast.success("Project deleted"); router.replace(`/w/${slug}/projects`); },
    onError: (e) => toast.error(e.message),
  });
  if (project.isLoading) return <Spinner />;
  if (project.error) return <ErrorState error={project.error} />;
  const p = project.data!;
  const s = summary.data;
  const used = s?.budget_used_percent ? Number(s.budget_used_percent) : null;
  return (
    <div className="max-w-6xl">
      <Link href={`/w/${slug}/projects`} className="text-sm text-stone-500 hover:underline">&larr; Projects</Link>
      <PageHeader title={`${p.code} ${p.name}`} description={p.description || undefined} guide="projects"
        actions={can("projects.manage") && <div className="flex gap-2">
          <Button variant="ghost" className="text-red-600" onClick={() => confirm("Delete this project?") && remove.mutate()}>Delete</Button>
          <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
        </div>} />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-5">
        <Meta label="Status"><Badge tone={PROJECT_STATUS[p.status ?? "active"].tone}>{PROJECT_STATUS[p.status ?? "active"].label}</Badge></Meta>
        <Meta label="Customer">{p.customer_name ?? "Internal"}</Meta>
        <Meta label="Manager">{p.manager_name ?? "-"}</Meta>
        <Meta label="Dates">{p.start_date ? fmtDate(p.start_date) : "-"}{p.end_date ? ` to ${fmtDate(p.end_date)}` : ""}</Meta>
        <Meta label="Contract value">{fmt(p.contract_value)}</Meta>
      </Card>
      {summary.isLoading ? <Spinner /> : summary.error ? <ErrorState error={summary.error} /> : s && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            <Stat label="Income" value={fmt(s.income)} hint={`Invoiced ${fmt(s.invoiced)}, unpaid ${fmt(s.outstanding)}`} />
            <Stat label="Costs" value={fmt(s.costs)} hint={s.budget_left !== null ? `${fmt(s.budget_left)} of the budget left` : "No cost budget set"} tone={s.budget_left !== null && Number(s.budget_left) < 0 ? "red" : undefined} />
            <Stat label="Profit" value={fmt(s.profit)} hint={s.margin_percent !== null ? `${s.margin_percent}% margin` : undefined} tone={Number(s.profit) < 0 ? "red" : "green"} />
            <Stat label="Left to invoice" value={s.contract_left_to_invoice !== null ? fmt(s.contract_left_to_invoice) : "-"} hint="Contract value less invoiced (with VAT)" />
          </div>
          {used !== null && (
            <Card className="mb-4 p-4">
              <div className="mb-1 flex justify-between text-sm"><span>Cost budget used</span><span className="font-mono">{used}% of {fmt(p.cost_budget)}</span></div>
              <div className="h-2.5 overflow-hidden rounded-full bg-stone-100"><div className={clsx("h-full rounded-full", used > 100 ? "bg-red-500" : used > 85 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.min(used, 100)}%` }} /></div>
            </Card>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="border-b border-stone-200 px-4 py-2.5 text-sm font-semibold">By account</h2>
              {s.by_account.length === 0 ? <EmptyState title="Nothing tagged yet">Choose this project on invoices, bills and expenses.</EmptyState> : (
                <Table head={["Account", "Income", "Cost"]}>
                  {s.by_account.map((r) => (
                    <tr key={r.account_id}><Td><Link className="hover:underline" href={`/w/${slug}/accounting/accounts/${r.account_id}`}><span className="mr-2 font-mono text-xs text-stone-400">{r.code}</span>{r.name}</Link></Td>
                      <Td className="text-right font-mono">{r.kind === "income" ? fmt(r.amount) : ""}</Td><Td className="text-right font-mono">{r.kind === "cost" ? fmt(r.amount) : ""}</Td></tr>
                  ))}
                </Table>
              )}
            </Card>
            <Card>
              <h2 className="border-b border-stone-200 px-4 py-2.5 text-sm font-semibold">Latest transactions</h2>
              {s.recent.length === 0 ? <EmptyState title="No transactions yet" /> : (
                <Table head={["Date", "Entry", "Account", "Amount"]}>
                  {s.recent.map((r, i) => (
                    <tr key={i}><Td className="whitespace-nowrap text-xs">{fmtDate(r.date)}</Td>
                      <Td><Link className="font-mono text-xs hover:underline" href={`/w/${slug}/accounting/journals/${r.entry_id}`}>{r.number}</Link><span className="block text-xs text-stone-500">{r.description}</span></Td>
                      <Td className="text-xs">{r.account}</Td>
                      <Td className={clsx("text-right font-mono", r.kind === "cost" && "text-stone-600")}>{r.kind === "cost" ? `(${fmt(r.amount)})` : fmt(r.amount)}</Td></tr>
                  ))}
                </Table>
              )}
            </Card>
          </div>
        </>
      )}
      <Modal open={editing} title="Edit project" onClose={() => setEditing(false)}><ProjectForm existing={p} onDone={() => setEditing(false)} /></Modal>
    </div>
  );
}
