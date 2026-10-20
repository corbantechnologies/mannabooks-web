"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { CustomerForm } from "@/components/customer-form";
import { Badge, Button, Card, EmptyState, ErrorState, Input, Modal, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function CustomersPage() {
  const { slug, can, context } = useWorkspace();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const list = useQuery({
    queryKey: ["customers", slug, "all", search],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/customers/", { params: { path: { workspace: slug }, query: { search: search || undefined, page_size: 200 } } })),
  });
  const rows = list.data?.results ?? [];

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Customers"
        description={`The people and businesses you sell to, and what each owes you (in ${context.workspace.currency}).`}
        guide="customers"
        actions={can("customers.manage") && <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New customer</Button>}
      />
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
        <Input className="pl-9" placeholder="Search name, number, phone, PIN" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title={search ? "No customers match" : "No customers yet"} />
        ) : (
          <Table head={["Number", "Name", "Phone", "KRA PIN", "Balance"]}>
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-stone-50">
                <Td className="font-mono text-xs">{c.number}</Td>
                <Td><Link href={`/w/${slug}/sales/customers/${c.id}`} className="font-medium hover:underline">{c.name}</Link> {!c.is_active && <Badge>Inactive</Badge>}</Td>
                <Td>{c.phone || "-"}</Td>
                <Td className="font-mono text-xs">{c.kra_pin || "-"}</Td>
                <Td className={`text-right font-mono ${Number(c.balance) < 0 ? "text-emerald-700" : ""}`}>{fmt(c.balance)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal size="lg" open={creating} title="New customer" onClose={() => setCreating(false)}>
        <CustomerForm onSaved={() => { toast.success("Customer added"); setCreating(false); }} onCancel={() => setCreating(false)} />
      </Modal>
    </div>
  );
}
