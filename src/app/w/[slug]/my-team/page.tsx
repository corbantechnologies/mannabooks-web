"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

/** A supervisor's page: everyone who reports to them (and to their people), and what's waiting for them. */
export default function MyTeamPage() {
  const { slug } = useWorkspace();
  const team = useQuery({ queryKey: ["my-team", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/employees/team/", wsPath(slug))) });
  const rows = team.data ?? [];
  const leave = rows.reduce((s, r) => s + r.leave_waiting, 0);
  const advances = rows.reduce((s, r) => s + r.advances_waiting, 0);
  const overdue = rows.reduce((s, r) => s + r.reports_overdue, 0);
  return (
    <div className="space-y-6">
      <PageHeader title="My team" guide="employees"
        description="The people who report to you, and the people who report to them. Open anyone to see their profile." />
      {team.isLoading ? <Spinner /> : team.error ? <ErrorState error={team.error} /> : rows.length === 0 ? (
        <Card><EmptyState title="Nobody reports to you" /></Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Waiting label="Leave waiting" count={leave} href={`/w/${slug}/leave`} />
            <Waiting label="Advances to recommend" count={advances} href={`/w/${slug}/advances`} />
            <Waiting label="Work reports overdue" count={overdue} href={`/w/${slug}/work-reports`} />
          </div>
          <Card>
            <Table head={["Name", "Job title", "Department", "Today", "Reports on time", "Waiting for you"]}>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td className="font-medium">
                    <Link href={`/w/${slug}/employees/${r.id}`} className="hover:underline">{r.full_name}</Link>
                    {!r.direct && r.reports_to && <p className="text-xs font-normal text-stone-500">through {r.reports_to}</p>}
                  </Td>
                  <Td>{r.job_title || "-"}</Td>
                  <Td>{r.department || "-"}</Td>
                  <Td>{r.away_until ? <Badge tone="amber">On leave until {fmtDate(r.away_until)}</Badge> : r.status === "on_leave" ? <Badge tone="amber">On leave</Badge> : <span className="text-stone-500">In</span>}</Td>
                  <Td>{r.on_time_percent == null ? <span className="text-stone-400">-</span> : <Badge tone={r.on_time_percent >= 90 ? "green" : r.on_time_percent >= 70 ? "amber" : "red"}>{r.on_time_percent}%</Badge>}
                    {r.reports_overdue > 0 && <span className="ml-1 text-xs text-red-600">{r.reports_overdue} overdue</span>}</Td>
                  <Td className="text-sm text-stone-600">{[r.leave_waiting && `${r.leave_waiting} leave`, r.advances_waiting && `${r.advances_waiting} advance`].filter(Boolean).join(", ") || ""}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}

function Waiting({ label, count, href }: { label: string; count: number; href: string }) {
  return (
    <Link href={href}>
      <Card className={`p-4 transition-colors hover:border-brand-300 ${count ? "border-amber-300" : ""}`}>
        <p className="text-sm text-stone-500">{label}</p>
        <p className="text-2xl font-semibold">{count}</p>
      </Card>
    </Link>
  );
}
