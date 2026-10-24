"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Meta } from "@/components/document-view";
import { RecurringForm } from "@/components/recurring-form";
import { Badge, Button, Card, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { FREQUENCIES, RECURRING_STATUS } from "@/lib/api/sales";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { ask } from "@/components/confirm";

export default function RecurringInvoicePage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const path = { params: { path: { workspace: slug, id } } };
  const [editing, setEditing] = useState(false);
  const rec = useQuery({ queryKey: ["recurring-invoice", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/recurring-invoices/{id}/", path)) });
  const act = useMutation({
    mutationFn: async (action: "pause" | "resume" | "end" | "run") => unwrap(await api.POST("/api/v1/w/{workspace}/recurring-invoices/{id}/action/", { ...path, body: { action } })),
    onSuccess: (r, action) => toast.success(action === "run" ? `Raised ${r.last_invoice_number || "a draft invoice"}` : `Schedule ${r.status}`),
    onError: (e) => toast.error(e.message),
  });
  if (rec.isLoading) return <Spinner />;
  if (rec.error) return <ErrorState error={rec.error} />;
  const r = rec.data!;
  const manage = can("recurringinvoices.manage");
  if (editing) {
    return (
      <div className="w-full">
        <PageHeader title={`Edit ${r.name}`} guide="recurring-invoices" />
        <RecurringForm existing={r} onDone={() => setEditing(false)} />
      </div>
    );
  }
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/sales/recurring-invoices`} className="text-sm text-stone-500 hover:underline">&larr; Recurring invoices</Link>
      <PageHeader
        title={r.name}
        description={r.customer_name}
        guide="recurring-invoices"
        actions={manage && r.status !== "ended" && (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" className="text-red-600" onClick={() => void ask("End this schedule? It can't be restarted.").then((ok) => ok && act.mutate("end"))}>End</Button>
            {r.status === "active" ? <Button variant="secondary" onClick={() => act.mutate("pause")}>Pause</Button> : <Button variant="secondary" onClick={() => act.mutate("resume")}>Resume</Button>}
            <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
            {r.status === "active" && <Button loading={act.isPending && act.variables === "run"} onClick={() => act.mutate("run")}>Raise next invoice now</Button>}
          </div>
        )}
      />
      {r.last_error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">The last run failed: {r.last_error}</div>}
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-4">
        <Meta label="Status"><Badge tone={RECURRING_STATUS[r.status].tone}>{RECURRING_STATUS[r.status].label}</Badge></Meta>
        <Meta label="Every">{FREQUENCIES[r.frequency ?? "monthly"]}</Meta>
        <Meta label="Next invoice">{r.status === "ended" ? "-" : fmtDate(r.next_run_date)}</Meta>
        <Meta label="Ends">{r.end_date ? fmtDate(r.end_date) : "When stopped"}</Meta>
        <Meta label="Invoices raised">{r.invoices_created}</Meta>
        <Meta label="Last invoice">{r.last_invoice_id ? <Link className="font-mono text-xs hover:underline" href={`/w/${slug}/sales/invoices/${r.last_invoice_id}`}>{r.last_invoice_number || "Draft"}</Link> : "-"}</Meta>
        <Meta label="On each run">{r.auto_issue ? "Issued automatically" : "Saved as a draft"}</Meta>
      </Card>
      <Card>
        <Table head={["Description", "Qty", "Price", "Disc %"]}>
          {(r.lines ?? []).map((l) => (
            <tr key={l.id}>
              <Td>{l.description || "(product name)"}</Td>
              <Td className="text-right font-mono">{Number(l.quantity)}</Td>
              <Td className="text-right font-mono">{l.unit_price == null ? "Current price" : fmt(l.unit_price)}</Td>
              <Td className="text-right font-mono">{Number(l.discount_percent) || ""}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
