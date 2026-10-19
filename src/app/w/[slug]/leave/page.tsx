"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { LEAVE_STATUS } from "@/lib/api/people";
import { fmtDate } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function LeavePage() {
  const { slug, can } = useWorkspace();
  const [status, setStatus] = useState("pending");
  const list = useQuery({
    queryKey: ["leave-requests", slug, status],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/leave-requests/", { params: { path: { workspace: slug }, query: { status: (status || undefined) as never, page_size: 200 } } })),
  });
  const balances = useQuery({
    queryKey: ["leave-balances", slug, "all"], enabled: can("leave.view") || can("leave.approve"),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/leave-requests/balances/", { params: { path: { workspace: slug }, query: { all: true } } })),
  });
  const act = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "decline" }) => unwrap(await api.POST("/api/v1/w/{workspace}/leave-requests/{id}/action/", { params: { path: { workspace: slug, id } }, body: { action } })),
    onSuccess: (r) => toast.success(`${r.employee_name}: ${LEAVE_STATUS[r.status ?? "pending"].label.toLowerCase()}`),
    onError: (e) => toast.error(e.message),
  });
  void wsPath;
  const rows = list.data?.results ?? [];
  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader title="Leave" description="Requests from your team. Supervisors decide for the people who report to them; department heads for their department." guide="leave" />
      <div className="w-56"><Select value={status} onChange={(e) => setStatus(e.target.value)}><option value="pending">Waiting for approval</option><option value="approved">Approved</option><option value="rejected">Declined</option><option value="">All</option></Select></div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : rows.length === 0 ? <EmptyState title="Nothing here" /> : (
          <Table head={["Employee", "Leave", "From", "To", "Days", "Reason", "Status", ""]}>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td className="font-medium">{r.employee_name}</Td><Td>{r.leave_type_label}</Td><Td>{fmtDate(r.start_date)}</Td><Td>{fmtDate(r.end_date)}</Td>
                <Td className="text-right">{Number(r.days)}</Td><Td className="max-w-xs text-stone-600">{r.reason}</Td>
                <Td><Badge tone={LEAVE_STATUS[r.status ?? "pending"].tone}>{LEAVE_STATUS[r.status ?? "pending"].label}</Badge></Td>
                <Td className="whitespace-nowrap">{r.can_decide && <>
                  <Button variant="ghost" className="px-2 py-1 text-green-700" onClick={() => act.mutate({ id: r.id, action: "approve" })}>Approve</Button>
                  <Button variant="ghost" className="px-2 py-1 text-red-600" onClick={() => act.mutate({ id: r.id, action: "decline" })}>Decline</Button>
                </>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {(balances.data ?? []).length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold">Annual leave this year</h2>
          <Card>
            <Table head={["Employee", "Entitled", "Taken", "Booked", "Left"]}>
              {balances.data!.map((b) => <tr key={b.employee_id}><Td>{b.employee_name}</Td><Td className="text-right">{Number(b.entitlement)}</Td><Td className="text-right">{Number(b.taken)}</Td><Td className="text-right">{Number(b.pending)}</Td><Td className="text-right font-semibold">{Number(b.remaining)}</Td></tr>)}
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}
