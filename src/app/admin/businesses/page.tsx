"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Badge, Card, EmptyState, ErrorState, Input, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { SUB_STATUS } from "@/lib/api/platform";
import { fmtDate } from "@/lib/format";

function Businesses() {
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [plan, setPlan] = useState(params.get("plan") ?? "");
  const list = useQuery({
    queryKey: ["platform-businesses", search, status, plan],
    queryFn: async () => unwrap(await api.GET("/api/v1/platform/businesses/", { params: { query: { search, status, plan, page_size: 100 } as never } })),
  });
  const rows = list.data?.results ?? [];
  return (
    <div className="w-full">
      <PageHeader title="Businesses" description="Every workspace on MannaBooks, its owner, plan and payment status." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-sm" placeholder="Name, owner email, KRA PIN or account number" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select className="max-w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any status</option>{Object.entries(SUB_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}<option value="blocked">Blocked</option>
        </Select>
        <Select className="max-w-36" value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="">Any plan</option>{["free", "biashara", "duka", "kampuni"].map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
        </Select>
      </div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? <EmptyState title="No businesses match" /> : (
          <Table head={["Business", "Owner", "Plan", "Status", "Paid to / trial ends", "Team", "Joined"]}>
            {rows.map((b) => (
              <tr key={b.id} className="hover:bg-stone-50">
                <Td><Link href={`/admin/businesses/${b.slug}`} className="font-medium hover:underline">{b.name}</Link><div className="font-mono text-xs text-stone-500">{b.account_number}</div></Td>
                <Td>{b.owner_name}{b.owner_full_access && <Badge tone="green">Full access</Badge>}<div className="text-xs text-stone-500">{b.owner_email}</div></Td>
                <Td>{b.plan}{b.complimentary && <span className="ml-1 text-xs text-brand-700">free (founding)</span>}</Td>
                <Td>{b.blocked_at ? <Badge tone="red">Blocked</Badge> : <Badge tone={SUB_STATUS[b.status ?? "active"]?.[1]}>{SUB_STATUS[b.status ?? "active"]?.[0]}</Badge>}</Td>
                <Td className="text-stone-600">{b.status === "trialing" ? fmtDate(b.trial_ends_on) : b.paid_until ? fmtDate(b.paid_until) : "-"}</Td>
                <Td className="text-right">{b.members}</Td>
                <Td className="text-stone-500">{fmtDate(b.created_at)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}

export default function BusinessesPage() {
  return <Suspense><Businesses /></Suspense>;
}
