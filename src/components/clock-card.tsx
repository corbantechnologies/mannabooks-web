"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coffee, LogIn, LogOut, MapPin, Wifi } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

import { Badge, Button, Card, FormError } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { DAY_STATUS, hm, hours } from "@/lib/attendance";
import { useWorkspace, wsPath } from "@/lib/workspace";

type Action = "in" | "out" | "break_start" | "break_end";

/** Clock in and out (and breaks) from your own phone or computer, with today's times. Shown only when Attendance is on and you are tracked. */
export function ClockCard({ showLink = false }: { showLink?: boolean }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["attendance-me", slug], refetchInterval: 60000, queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/attendance/me/", wsPath(slug))) });
  const act = useMutation({
    mutationFn: async (action: Action) => unwrap(await api.POST("/api/v1/w/{workspace}/attendance/clock/", { ...wsPath(slug), body: { action } })),
    onSuccess: (_d, action) => {
      toast.success({ in: "Clocked in", out: "Clocked out. See you tomorrow", break_start: "Enjoy your break", break_end: "Welcome back" }[action]);
      void qc.invalidateQueries({ queryKey: ["attendance-me", slug] });
      void qc.invalidateQueries({ queryKey: ["attendance-people", slug] });
    },
  });
  const me = q.data;
  if (!me?.enabled || !me.tracked) return null;
  const day = me.today;
  const st = day?.state ?? "out";
  const status = day ? DAY_STATUS[day.status] : undefined;
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">{day?.shift_name ? `${day.shift_name} shift` : "Today"}{me.pattern === "fixed" && me.start_time ? `, ${me.start_time.slice(0, 5)} to ${me.end_time?.slice(0, 5)}` : `, flexible: ${Number(me.weekly_hours)} h a week`}</p>
          <p className="mt-1 text-xl font-semibold">
            {st === "out" ? "Not clocked in" : st === "done" ? "Clocked out" : st === "on_break" ? "On a break" : "Clocked in"}
            {status && st !== "out" && <span className="ml-2 align-middle"><Badge tone={status[1]}>{status[0]}</Badge></span>}
          </p>
          <p className="mt-1 text-sm text-stone-600">
            {day?.first_in ? `In at ${hm(day.first_in)}` : ""}{day?.last_out && st === "done" ? ` · out at ${hm(day.last_out)}` : ""}
            {day && day.minutes > 0 ? ` · ${hours(day.minutes)} worked` : ""}{day && day.late_minutes > 0 ? ` · ${hours(day.late_minutes)} late` : ""}
          </p>
          <p className="mt-0.5 text-xs text-stone-500">This week: {hours(me.week_minutes)}{me.pattern === "flexible" ? ` of ${Number(me.weekly_hours)} h` : ""}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {me.at_office != null && (
            <span className={`inline-flex items-center gap-1 text-xs ${me.at_office ? "text-emerald-700" : "text-amber-700"}`}>
              {me.at_office ? <Wifi className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}{me.at_office ? "On the office network" : "Away from the office network"}
            </span>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {(st === "out" || st === "done") && <Button loading={act.isPending} onClick={() => act.mutate("in")}><LogIn className="h-4 w-4" /> {st === "done" ? "Clock in again" : "Clock in"}</Button>}
            {st === "in" && me.break_buttons && <Button variant="secondary" loading={act.isPending} onClick={() => act.mutate("break_start")}><Coffee className="h-4 w-4" /> Start break</Button>}
            {st === "on_break" && <Button variant="secondary" loading={act.isPending} onClick={() => act.mutate("break_end")}><Coffee className="h-4 w-4" /> End break</Button>}
            {(st === "in" || st === "on_break") && <Button variant="secondary" loading={act.isPending} onClick={() => act.mutate("out")}><LogOut className="h-4 w-4" /> Clock out</Button>}
          </div>
        </div>
      </div>
      <FormError error={act.error} />
      {showLink && <Link href={`/w/${slug}/attendance`} className="mt-3 inline-block text-sm text-brand-700 hover:underline">My days and corrections &rarr;</Link>}
    </Card>
  );
}
