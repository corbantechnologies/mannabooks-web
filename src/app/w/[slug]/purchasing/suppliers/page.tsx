"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { SupplierForm } from "@/components/supplier-form";
import { Badge, Button, Card, EmptyState, ErrorState, Input, Modal, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function SuppliersPage() {
  const { slug, can, context } = useWorkspace();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const list = useQuery({
    queryKey: ["suppliers", slug, search],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/suppliers/", { params: { path: { workspace: slug }, query: { search: search || undefined, page_size: 200 } } })),
  });
  const rows = list.data?.results ?? [];
  return (
    <div className="w-full">
      <PageHeader title="Suppliers" description={`Who you buy from, and what you owe each of them (in ${context.workspace.currency}).`} guide="suppliers"
        actions={can("suppliers.manage") && <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New supplier</Button>} />
      <div className="mb-4 max-w-sm"><Input placeholder="Search name, phone or KRA PIN" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title="No suppliers yet" />
        ) : (
          <Table head={["No.", "Name", "Phone", "KRA PIN", "You owe"]}>
            {rows.map((s) => (
              <tr key={s.id} className="hover:bg-stone-50">
                <Td className="font-mono text-xs">{s.number}</Td>
                <Td><Link href={`/w/${slug}/purchasing/suppliers/${s.id}`} className="font-medium hover:underline">{s.name}</Link> {!s.is_active && <Badge>Inactive</Badge>}</Td>
                <Td>{s.phone || "-"}</Td>
                <Td className="font-mono text-xs">{s.kra_pin || "-"}</Td>
                <Td className="text-right font-mono">{fmt(s.balance)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal size="lg" open={creating} title="New supplier" onClose={() => setCreating(false)}>
        <SupplierForm onSaved={(s) => { toast.success(`${s.name} added`); setCreating(false); router.push(`/w/${slug}/purchasing/suppliers/${s.id}`); }} onCancel={() => setCreating(false)} />
      </Modal>
    </div>
  );
}
