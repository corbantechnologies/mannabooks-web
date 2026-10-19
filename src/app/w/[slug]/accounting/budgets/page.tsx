"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { TagPickers, type Tags, tagsBody } from "@/components/tag-pickers";
import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { BUDGET_STATUS, useFiscalYears } from "@/lib/api/control";
import { fmt } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function BudgetsPage() {
  const { slug, can } = useWorkspace();
  const router = useRouter();
  const years = useFiscalYears(slug);
  const list = useQuery({
    queryKey: ["budgets", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/budgets/", { params: { path: { workspace: slug }, query: { page_size: 100 } } })),
  });
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ name: "Operating budget", fiscal_year_id: "" });
  const [tags, setTags] = useState<Tags>({ cost_center_id: "", project_id: "" });
  const yearId = f.fiscal_year_id || (years.data?.find((y) => y.status === "open")?.id ?? "");
  const create = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/budgets/", {
      params: { path: { workspace: slug } }, body: { name: f.name, fiscal_year_id: yearId, ...tagsBody(tags), lines: [] } as never,
    })),
    onSuccess: (b) => router.push(`/w/${slug}/accounting/budgets/${b.id}`),
  });
  const rows = list.data?.results ?? [];
  return (
    <div className="max-w-5xl">
      <PageHeader title="Budgets" guide="budgets"
        description="Plan the year's income and spending month by month, for the whole business or one cost centre or project, then watch the actual figures against it."
        actions={can("budgets.manage") && <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New budget</Button>} />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="No budgets yet">Start one for this financial year. You can copy last year&apos;s figures and add a percentage.</EmptyState>
        ) : (
          <Table head={["Budget", "Year", "For", "Income", "Spending", "Status"]}>
            {rows.map((b) => (
              <tr key={b.id} className="hover:bg-stone-50">
                <Td><Link className="font-medium hover:underline" href={`/w/${slug}/accounting/budgets/${b.id}`}>{b.name}</Link></Td>
                <Td>{b.fiscal_year_name}</Td>
                <Td>{b.cost_center_name ?? b.project_name ?? "Whole business"}</Td>
                <Td className="text-right font-mono">{fmt(b.total_income)}</Td>
                <Td className="text-right font-mono">{fmt(b.total_expense)}</Td>
                <Td><Badge tone={BUDGET_STATUS[b.status ?? "draft"].tone}>{BUDGET_STATUS[b.status ?? "draft"].label}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={creating} title="New budget" onClose={() => setCreating(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <Field label="Name"><Input required value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} /></Field>
          <Field label="Financial year"><Select required value={yearId} onChange={(e) => setF((x) => ({ ...x, fiscal_year_id: e.target.value }))}>{(years.data ?? []).map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</Select></Field>
          <p className="text-xs text-stone-500">Leave cost centre and project empty for a budget of the whole business.</p>
          <div className="grid gap-3 sm:grid-cols-2"><TagPickers value={tags} onChange={setTags} /></div>
          <FormError error={create.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit" loading={create.isPending}>Create and plan</Button></div>
        </form>
      </Modal>
    </div>
  );
}
