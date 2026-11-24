"use client";

import { useState } from "react";

import { fmt } from "@/lib/format";

export type Series = { key: string; label: string; color: string; kind: "bar" | "line"; dashedFrom?: number };

const compact = (n: number) => {
  const a = Math.abs(n);
  const s = a >= 1e9 ? `${(a / 1e9).toFixed(1)}B` : a >= 1e6 ? `${(a / 1e6).toFixed(1)}M` : a >= 1e3 ? `${Math.round(a / 1e3)}K` : `${Math.round(a)}`;
  return `${n < 0 ? "-" : ""}${s}`;
};

/**
 * Bars and lines over months, drawn in SVG (no chart library): bars side by side for amounts like income and costs, a
 * line for a running figure like cash. A dashed line from `dashedFrom` marks a projection. `floor` draws a red line.
 */
export function MonthChart({ rows, series, floor, height = 240 }: { rows: (Record<string, number | string> & { label: string })[]; series: Series[]; floor?: number | null; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = height, padL = 52, padR = 12, padT = 12, padB = 28;
  const values = rows.flatMap((r) => series.map((s) => Number(r[s.key]) || 0)).concat(floor != null ? [floor] : []).concat([0]);
  const max = Math.max(...values), min = Math.min(...values);
  const span = max - min || 1;
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - min) / span);
  const step = (W - padL - padR) / Math.max(rows.length, 1);
  const bars = series.filter((s) => s.kind === "bar");
  const barW = Math.min(28, (step * 0.7) / Math.max(bars.length, 1));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + span * t);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Chart by month" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#e7e5e4" strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill="#78716c">{compact(t)}</text>
          </g>
        ))}
        {min < 0 && <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="#a8a29e" strokeWidth={1} />}
        {floor != null && (
          <g>
            <line x1={padL} x2={W - padR} y1={y(floor)} y2={y(floor)} stroke="#dc2626" strokeDasharray="4 3" strokeWidth={1.5} />
            <text x={W - padR} y={y(floor) - 4} textAnchor="end" fontSize={10} fill="#dc2626">Floor {compact(floor)}</text>
          </g>
        )}
        {rows.map((r, i) => {
          const cx = padL + step * i + step / 2;
          return (
            <g key={r.label} onMouseEnter={() => setHover(i)}>
              <rect x={padL + step * i} y={padT} width={step} height={H - padT - padB} fill={hover === i ? "#f5f5f4" : "transparent"} />
              {bars.map((s, k) => {
                const v = Number(r[s.key]) || 0;
                const x = cx - (bars.length * barW) / 2 + k * barW;
                return <rect key={s.key} x={x} y={Math.min(y(v), y(0))} width={barW - 2} height={Math.max(1, Math.abs(y(v) - y(0)))} rx={2} fill={s.color} />;
              })}
              <text x={cx} y={H - 10} textAnchor="middle" fontSize={10} fill="#78716c">{r.label.replace(/ \d{4}$/, (m) => (rows.length > 8 ? "" : m))}</text>
            </g>
          );
        })}
        {series.filter((s) => s.kind === "line").map((s) => {
          const pts = rows.map((r, i) => [padL + step * i + step / 2, y(Number(r[s.key]) || 0)] as const);
          const cut = s.dashedFrom ?? pts.length;
          const solid = pts.slice(0, Math.max(cut, 1) + (cut < pts.length ? 1 : 0));
          const dashed = cut < pts.length ? pts.slice(Math.max(cut - 1, 0)) : [];
          const d = (p: readonly (readonly [number, number])[]) => p.map(([x, yy], i) => `${i ? "L" : "M"}${x},${yy}`).join(" ");
          return (
            <g key={s.key}>
              {solid.length > 1 && <path d={d(solid)} fill="none" stroke={s.color} strokeWidth={2.5} />}
              {dashed.length > 1 && <path d={d(dashed)} fill="none" stroke={s.color} strokeWidth={2.5} strokeDasharray="6 4" />}
              {pts.map(([x, yy], i) => <circle key={i} cx={x} cy={yy} r={hover === i ? 4.5 : 3} fill={s.color} />)}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex flex-wrap gap-3 text-xs text-stone-600">
        {series.map((s) => <span key={s.key} className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />{s.label}</span>)}
      </div>
      {hover !== null && rows[hover] && (
        <div className="pointer-events-none absolute right-2 top-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-xs shadow-sm">
          <p className="mb-1 font-semibold">{rows[hover].label}</p>
          {series.map((s) => <p key={s.key} className="flex justify-between gap-4"><span>{s.label}</span><span className="font-mono">{fmt(Number(rows[hover][s.key]) || 0)}</span></p>)}
        </div>
      )}
    </div>
  );
}
