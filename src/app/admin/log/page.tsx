"use client";

import { useQuery } from "@tanstack/react-query";

import { Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";

export default function AdminLogPage() {
  const list = useQuery({ queryKey: ["platform-actions"], queryFn: async () => unwrap(await api.GET("/api/v1/platform/actions/", { params: { query: { page_size: 200 } as never } })) });
  const rows = list.data?.results ?? [];
  return (
    <div className="w-full">
      <PageHeader title="Admin log" description="Everything MannaBooks staff did in the admin, newest first." />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? <EmptyState title="Nothing yet" /> : (
          <Table head={["When", "Who", "Did", "To", "Details"]}>
            {rows.map((a) => (
              <tr key={a.id}>
                <Td className="whitespace-nowrap text-stone-500">{new Date(a.created_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</Td>
                <Td>{a.actor_name}</Td>
                <Td>{a.action.replace(/_/g, " ")}</Td>
                <Td>{a.target_label}<div className="text-xs text-stone-500">{a.target_type}</div></Td>
                <Td className="text-xs text-stone-600">{Object.entries(a.details as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join(" · ")}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
