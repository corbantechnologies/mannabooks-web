import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type AttendanceDay = S["AttendanceDay"];
export type AttendancePerson = S["AttendancePersonDay"];
export type AttendanceMe = S["AttendanceMe"];

export const DAY_STATUS: Record<string, [string, "green" | "blue" | "amber" | "red" | "stone"]> = {
  in: ["In", "green"], on_break: ["On a break", "blue"], gone_home: ["Gone home", "stone"], no_clock_out: ["No clock-out", "amber"],
  not_in_yet: ["Not in yet", "amber"], expected: ["Expected", "stone"], absent: ["Absent", "red"], on_leave: ["On leave", "blue"],
  off: ["Off today", "stone"], not_tracked: ["Not tracked yet", "stone"], present: ["Present", "green"], half_day: ["Half day", "amber"],
};

export const WORKER_TYPES: [string, string][] = [
  ["permanent", "Permanent (salaried)"], ["contract", "Fixed-term contract"], ["casual", "Casual"], ["work_for_hire", "Work for hire"],
  ["volunteer", "Volunteer"], ["intern", "Intern or attachment"],
];

/** 465 → "7 h 45 min". */
export function hours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}

/** "08:42" in the viewer's clock. */
export function hm(iso?: string | null): string {
  return iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "-";
}
