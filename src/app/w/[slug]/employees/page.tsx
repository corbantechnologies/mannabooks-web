"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ActionMenu } from "@/components/action-menu";
import { Badge, Card, EmptyState, ErrorState, Input, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace } from "@/lib/workspace";

const STATUS_TONE = { active: "green", on_leave: "amber", exited: "stone" } as const;

export default function EmployeesPage() {
  const { slug, can } = useWorkspace();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const manage = can("employees.manage");
  const viewAll = can("employees.view");
  const list = useQuery({
    queryKey: ["employees", slug, search],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/employees/", { params: { path: { workspace: slug }, query: { search: search || undefined, page_size: 200 } } })),
  });
  const rows = list.data?.results ?? [];
  const profile = (id: string) => `/w/${slug}/employees/${id}`;

  return (
    <div className="w-full">
      <PageHeader
        title={viewAll ? "Employees" : "My employee record"}
        description={viewAll ? "Everyone who works here. Open someone to see their profile and edit their details." : "Your details as HR has them. Ask HR to correct anything wrong."}
        guide="employees"
        actions={(manage || can("payroll.view")) && <ActionMenu label="Actions" primary actions={[
          { label: "New employee", href: `/w/${slug}/employees/new`, hidden: !manage },
          { label: "Download list (Excel): for PAYE", onClick: () => { window.location.href = `/api/backend/api/v1/w/${slug}/employees/export/`; }, hidden: !can("payroll.view") },
          { label: "Download list with past staff (Excel)", onClick: () => { window.location.href = `/api/backend/api/v1/w/${slug}/employees/export/?include_exited=true`; }, hidden: !can("payroll.view") },
        ]} />}
      />
      {viewAll && (
        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <Input className="pl-9" placeholder="Search name, staff number, phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title={search ? "No employees match" : "No employees yet"} />
        ) : (
          <Table head={["Staff no.", "Name", "Job title", "Department", "Reports to", "Login", "Status"]}>
            {rows.map((e) => (
              <tr key={e.id} className="cursor-pointer hover:bg-stone-50" onClick={() => router.push(profile(e.id))}>
                <Td className="font-mono text-xs">{e.staff_number}</Td>
                <Td className="font-medium"><Link href={profile(e.id)} className="hover:underline" onClick={(ev) => ev.stopPropagation()}>{e.full_name}</Link>{Boolean(e.pending_changes) && manage ? <span className="ml-2"><Badge tone="amber">Changes to check</Badge></span> : null}</Td>
                <Td>{e.job_title || "-"}</Td>
                <Td>{e.department_name || "-"}</Td>
                <Td>{e.reports_to_name || "-"}</Td>
                <Td>{e.has_login ? <Badge tone="green">Yes</Badge> : <Badge>No</Badge>}</Td>
                <Td><Badge tone={STATUS_TONE[e.status ?? "active"]}>{(e.status ?? "active").replace("_", " ")}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
