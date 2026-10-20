"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Badge, Card, EmptyState, ErrorState, Input, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { PRIORITY, TICKET_STATUS } from "@/lib/api/platform";
import { fmtDate } from "@/lib/format";

function Tickets() {
  const params = useSearchParams();
  const [status, setStatus] = useState(params.get("status") ?? "open");
  const [priority, setPriority] = useState(params.get("priority") ?? "");
  const [mine, setMine] = useState(false);
  const [search, setSearch] = useState("");
  const list = useQuery({
    queryKey: ["platform-tickets", status, priority, mine, search],
    queryFn: async () => unwrap(await api.GET("/api/v1/platform/tickets/", { params: { query: { status: status || undefined, priority: priority || undefined, mine: mine ? "true" : undefined, search: search || undefined, page_size: 100 } as never } })),
  });
  const rows = list.data?.results ?? [];
  return (
    <div className="w-full">
      <PageHeader title="Support tickets" description="Questions, problems and complaints from businesses. Unanswered ones are in bold." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select className="max-w-44" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Any status</option>{Object.entries(TICKET_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</Select>
        <Select className="max-w-36" value={priority} onChange={(e) => setPriority(e.target.value)}><option value="">Any priority</option>{Object.entries(PRIORITY).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</Select>
        <Input className="max-w-xs" placeholder="Number, subject, business, email" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Assigned to me</label>
      </div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? <EmptyState title="No tickets" /> : (
          <Table head={["Ticket", "Business", "From", "Priority", "Status", "Updated"]}>
            {rows.map((t) => (
              <tr key={t.id} className={!t.last_reply_by_staff && t.status === "open" ? "font-semibold" : ""}>
                <Td><Link href={`/admin/tickets/${t.id}`} className="hover:underline">{t.number}: {t.subject}</Link><div className="text-xs font-normal text-stone-500">{t.category}</div></Td>
                <Td className="font-normal">{t.business_slug ? <Link href={`/admin/businesses/${t.business_slug}`} className="hover:underline">{t.business}</Link> : "-"}</Td>
                <Td className="font-normal">{t.raised_by_name}<div className="text-xs text-stone-500">{t.raised_by_email}</div></Td>
                <Td><Badge tone={PRIORITY[t.priority ?? "normal"][1]}>{PRIORITY[t.priority ?? "normal"][0]}</Badge></Td>
                <Td><Badge tone={TICKET_STATUS[t.status ?? "open"][1]}>{TICKET_STATUS[t.status ?? "open"][0]}</Badge>{t.assigned_to_name && <div className="text-xs font-normal text-stone-500">{t.assigned_to_name}</div>}</Td>
                <Td className="font-normal text-stone-500">{fmtDate(t.updated_at)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}

export default function TicketsPage() {
  return <Suspense><Tickets /></Suspense>;
}
