"use client";

import { useQuery } from "@tanstack/react-query";

import { Badge, Card, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { DAY_STATUS, hm, hours } from "@/lib/attendance";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

/** On the employee profile: their last two weeks of attendance, for the people who may see them. Hidden when not tracked. */
export function AttendanceProfile({ employeeId }: { employeeId: string }) {
  const { slug } = useWorkspace();
  const q = useQuery({
    queryKey: ["attendance-days", slug, employeeId], retry: false,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/attendance/people/{employee_id}/days/", { params: { path: { workspace: slug, employee_id: employeeId } } })),
  });
  const days = (q.data ?? []).filter((d) => d.status !== "not_tracked");
  if (!days.length) return null;
  const worked = days.filter((d) => ["in", "on_break", "gone_home", "no_clock_out", "present", "half_day"].includes(d.status)).length;
  const late = days.filter((d) => d.late_minutes > 0).length;
  const absent = days.filter((d) => d.status === "absent").length;
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">Attendance, last two weeks</h2>
      <p className="mb-2 text-sm text-stone-600">{worked} days worked · late on {late} · absent {absent} · {hours(days.reduce((a, d) => a + d.minutes, 0))} in all</p>
      <Card>
        <Table head={["Day", "Status", "In", "Out", "Worked"]}>
          {days.slice(0, 14).map((d) => (
            <tr key={d.day}>
              <Td className="whitespace-nowrap">{fmtDate(d.day)}</Td>
              <Td><Badge tone={DAY_STATUS[d.status]?.[1] ?? "stone"}>{DAY_STATUS[d.status]?.[0] ?? d.status}</Badge>{d.late_minutes > 0 && <span className="ml-1 text-xs text-amber-700">{hours(d.late_minutes)} late</span>}</Td>
              <Td className="text-right font-mono">{hm(d.first_in)}</Td>
              <Td className="text-right font-mono">{hm(d.last_out)}</Td>
              <Td className="text-right font-mono">{d.minutes ? hours(d.minutes) : "-"}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </section>
  );
}
