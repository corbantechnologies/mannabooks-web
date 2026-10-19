"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ProjectForm } from "@/components/project-form";
import { Badge, Button, Card, EmptyState, ErrorState, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { PROJECT_STATUS } from "@/lib/api/control";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function ProjectsPage() {
  const { slug, can } = useWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [creating, setCreating] = useState(false);
  const list = useQuery({
    queryKey: ["projects", slug, search, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/projects/", {
      params: { path: { workspace: slug }, query: { search: search || undefined, status: (status || undefined) as never, page_size: 100 } },
    })),
  });
  const rows = list.data?.results ?? [];
  return (
    <div className="max-w-6xl">
      <PageHeader title="Projects" guide="projects"
        description="Jobs and contracts whose income and costs you track together. Tag invoices, bills and expenses with the project to see its profit."
        actions={can("projects.manage") && <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New project</Button>} />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-full max-w-xs"><Input placeholder="Search code, name or customer" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="w-44"><Select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option>{Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></div>
      </div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="No projects here" />
        ) : (
          <Table head={["Code", "Project", "Customer", "Dates", "Contract", "Cost budget", "Status"]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50">
                <Td className="font-mono text-xs"><Link className="hover:underline" href={`/w/${slug}/projects/${r.id}`}>{r.code}</Link></Td>
                <Td><Link className="font-medium hover:underline" href={`/w/${slug}/projects/${r.id}`}>{r.name}</Link>{r.manager_name && <span className="block text-xs text-stone-500">{r.manager_name}</span>}</Td>
                <Td>{r.customer_name ?? "-"}</Td>
                <Td className="text-xs">{r.start_date ? fmtDate(r.start_date) : "-"}{r.end_date ? ` to ${fmtDate(r.end_date)}` : ""}</Td>
                <Td className="text-right font-mono">{fmt(r.contract_value)}</Td>
                <Td className="text-right font-mono">{fmt(r.cost_budget)}</Td>
                <Td><Badge tone={PROJECT_STATUS[r.status ?? "active"].tone}>{PROJECT_STATUS[r.status ?? "active"].label}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={creating} title="New project" onClose={() => setCreating(false)}><ProjectForm onDone={() => setCreating(false)} /></Modal>
    </div>
  );
}
