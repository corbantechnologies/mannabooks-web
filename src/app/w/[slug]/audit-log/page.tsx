"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Badge, Card, EmptyState, ErrorState, Input, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace } from "@/lib/workspace";

const TONE = { create: "green", update: "blue", delete: "red", other: "stone" } as const;

export default function AuditLogPage() {
  const { slug } = useWorkspace();
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const logs = useQuery({
    queryKey: ["audit-logs", slug, action, search],
    queryFn: async () =>
      unwrap(
        await api.GET("/api/v1/w/{workspace}/audit-logs/", {
          params: { path: { workspace: slug }, query: { action: (action || undefined) as "create" | "update" | "delete" | "other" | undefined, search: search || undefined } },
        }),
      ),
  });
  const rows = logs.data?.results ?? [];

  return (
    <div className="w-full">
      <PageHeader title="Audit log" description="Every change made in this workspace: who, what and when. It can't be edited." guide="audit-log" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Select className="max-w-40" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All changes</option>
          <option value="create">Created</option>
          <option value="update">Updated</option>
          <option value="delete">Deleted</option>
        </Select>
        <Input className="max-w-xs" placeholder="Search record" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Card>
        {logs.isLoading ? <div className="px-4"><Spinner /></div> : logs.error ? <div className="p-4"><ErrorState error={logs.error} /></div> : rows.length === 0 ? (
          <EmptyState title="No changes found" />
        ) : (
          <Table head={["When", "Who", "Change", "Record", "Details"]}>
            {rows.map((log) => (
              <tr key={log.id}>
                <Td className="whitespace-nowrap text-xs text-stone-500">{new Date(log.created_at).toLocaleString("en-KE")}</Td>
                <Td>{log.actor_name || "System"}</Td>
                <Td><Badge tone={TONE[log.action]}>{log.action}</Badge></Td>
                <Td><span className="text-stone-500">{log.model.split(".")[1]}</span> {log.object_repr}</Td>
                <Td className="max-w-md text-xs text-stone-600"><Details changes={log.changes} /></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}

const show = (v: unknown): string => (v === null || v === undefined || v === "" ? "-" : typeof v === "object" ? JSON.stringify(v) : String(v));

/**
 * What changed. An edit records {field: {from, to}}; other entries record whatever explains them (a status, what was sent,
 * a list of amounts), so anything that isn't a from/to pair is shown as it is, never assumed.
 */
function Details({ changes }: { changes: unknown }) {
  if (!changes || typeof changes !== "object") return changes ? <span>{show(changes)}</span> : null;
  return (
    <>
      {Object.entries(changes as Record<string, unknown>).map(([field, change]) => {
        const pair = change && typeof change === "object" && !Array.isArray(change) && ("from" in change || "to" in change) ? (change as { from?: unknown; to?: unknown }) : null;
        return (
          <div key={field} className="break-words">
            <strong>{field.replace(/_/g, " ")}</strong>: {pair ? <>{show(pair.from)} &rarr; {show(pair.to)}</> : Array.isArray(change) ? change.map(show).join(", ") : show(change)}
          </div>
        );
      })}
    </>
  );
}
