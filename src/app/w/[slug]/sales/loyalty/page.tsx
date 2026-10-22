"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EnrolModal } from "@/components/enrol-modal";
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function LoyaltyPage() {
  const { slug, can } = useWorkspace();
  const [search, setSearch] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const program = useQuery({ queryKey: ["loyalty-program", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/loyalty/program/", wsPath(slug))) });
  const members = useQuery({
    queryKey: ["loyalty-members", slug, search],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/loyalty/members/", { params: { path: { workspace: slug }, query: { search: search || undefined, page_size: 100 } } })),
  });
  const rows = members.data?.results ?? [];
  return (
    <div className="w-full">
      <PageHeader
        title="Loyalty"
        description="Customers earn points on what they spend and use them as a discount at the till."
        guide="loyalty"
        actions={
          <div className="flex flex-wrap gap-2">
            {can("loyalty.manage") && <Link href={`/w/${slug}/sales/loyalty/settings`}><Button variant="secondary"><Settings className="h-4 w-4" /> Settings and tiers</Button></Link>}
            {can("loyalty.enrol") && <Button onClick={() => setEnrolling(true)} disabled={!program.data?.is_active}><Plus className="h-4 w-4" /> Enrol customer</Button>}
          </div>
        }
      />
      {program.data && !program.data.is_active && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The loyalty programme is off. {can("loyalty.manage") ? <Link className="underline" href={`/w/${slug}/sales/loyalty/settings`}>Set it up and switch it on.</Link> : "Ask a manager to switch it on."}
        </div>
      )}
      <div className="mb-4 max-w-sm"><Input placeholder="Search name, phone or card" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <Card>
        {members.isLoading ? <div className="px-4"><Spinner /></div> : members.error ? <div className="p-4"><ErrorState error={members.error} /></div> : rows.length === 0 ? (
          <EmptyState title="No members yet" />
        ) : (
          <Table head={["Card", "Customer", "Phone", "Tier", "Points", "Worth"]}>
            {rows.map((m) => (
              <tr key={m.id} className="hover:bg-stone-50">
                <Td><Link href={`/w/${slug}/sales/loyalty/${m.id}`} className="font-mono text-xs font-medium hover:underline">{m.card_number}</Link></Td>
                <Td>{m.customer_name} {!m.is_active && <Badge>Inactive</Badge>}</Td>
                <Td>{m.customer_phone || "-"}</Td>
                <Td>{m.tier_name ? <Badge tone="amber">{m.tier_name}</Badge> : "-"}</Td>
                <Td className="text-right font-mono">{m.points_balance}</Td>
                <Td className="text-right font-mono">{fmt(m.points_value)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {enrolling && <EnrolModal onClose={() => setEnrolling(false)} />}
    </div>
  );
}
