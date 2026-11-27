import { hm } from "@/lib/attendance";

type Event = { kind: string; at: string; method?: string | null };
type Session = { in: string; out: string | null; outAuto: boolean; breaks: { from: string; to: string | null }[] };

/** A day's clock events as sessions: each clock-in to its clock-out, with the breaks taken inside it. */
export function sessionsOf(events: Event[]): Session[] {
  const out: Session[] = [];
  let cur: Session | null = null;
  for (const e of [...events].sort((a, b) => a.at.localeCompare(b.at))) {
    if (e.kind === "in") {
      cur = { in: e.at, out: null, outAuto: false, breaks: [] };
      out.push(cur);
    } else if (cur && e.kind === "out") {
      cur.out = e.at;
      cur.outAuto = e.method === "auto";
      const open = cur.breaks[cur.breaks.length - 1];
      if (open && !open.to) open.to = e.at;
      cur = null;
    } else if (cur && e.kind === "break_start") {
      cur.breaks.push({ from: e.at, to: null });
    } else if (cur && e.kind === "break_end") {
      const open = cur.breaks[cur.breaks.length - 1];
      if (open && !open.to) open.to = e.at;
    }
  }
  return out;
}

/**
 * Every clock-in and clock-out of the day, one line each ("18:10–18:10 *", "23:35–02:19"), with breaks under them.
 * "now" for a session still open; * for a clock-out MannaBooks made because none was recorded.
 */
export function Sessions({ events, showBreaks = true }: { events: Event[]; showBreaks?: boolean }) {
  const list = sessionsOf(events);
  if (!list.length) return <span className="text-stone-400">-</span>;
  return (
    <span className="inline-flex flex-col items-end gap-0.5 font-mono">
      {list.map((s) => (
        <span key={s.in} className="whitespace-nowrap">
          {hm(s.in)}–{s.out ? hm(s.out) : <span className="font-sans text-emerald-700">now</span>}
          {s.outAuto && <span title="Closed automatically: no clock-out" className="text-amber-700"> *</span>}
          {showBreaks && s.breaks.map((b) => (
            <span key={b.from} className="block font-sans text-xs text-stone-500">break {hm(b.from)}–{b.to ? hm(b.to) : "now"}</span>
          ))}
        </span>
      ))}
    </span>
  );
}
