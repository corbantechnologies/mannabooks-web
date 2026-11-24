"use client";

import { Square, X } from "lucide-react";
import { useRef } from "react";

/**
 * A checklist typed as checkboxes: one step per row, Enter for the next, Backspace on an empty row to remove it, and a
 * pasted list split into steps. The value stays plain text, one step per line, as the task form sends it.
 */
export function ChecklistEditor({ value, onChange, placeholder = ["Draft", "Review with the client", "Send the final PDF"] }:
  { value: string; onChange: (v: string) => void; placeholder?: string[] }) {
  const rows = value === "" ? [""] : value.split("\n");
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const set = (next: string[]) => onChange(next.join("\n"));
  const focus = (i: number) => window.setTimeout(() => refs.current[i]?.focus(), 0);

  return (
    <ul className="space-y-1 rounded-md border border-stone-200 bg-white p-2">
      {rows.map((row, i) => (
        <li key={i} className="flex items-center gap-2">
          <Square className="h-4 w-4 shrink-0 text-stone-400" aria-hidden />
          <input
            ref={(el) => { refs.current[i] = el; }}
            value={row}
            placeholder={i < placeholder.length && rows.length === 1 ? placeholder[i] : i === rows.length - 1 ? "Add a step" : ""}
            aria-label={`Step ${i + 1}`}
            className="min-w-0 flex-1 border-0 bg-transparent px-1 py-1 text-sm focus:outline-none focus:ring-0"
            onChange={(e) => set(rows.map((r, j) => (j === i ? e.target.value : r)))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                set([...rows.slice(0, i + 1), "", ...rows.slice(i + 1)]);
                focus(i + 1);
              } else if (e.key === "Backspace" && row === "" && rows.length > 1) {
                e.preventDefault();
                set(rows.filter((_, j) => j !== i));
                focus(Math.max(0, i - 1));
              }
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (!text.includes("\n")) return;
              e.preventDefault();
              const pasted = text.split(/\r?\n/).map((x) => x.replace(/^\s*(?:[-*•]|\[ ?\]|\d+[.)])\s*/, "").trim()).filter(Boolean);
              set([...rows.slice(0, i), ...(row ? [row] : []), ...pasted, ...rows.slice(i + 1)]);
              focus(i + pasted.length);
            }}
          />
          {rows.length > 1 && (
            <button type="button" aria-label={`Remove step ${i + 1}`} className="rounded p-1 text-stone-300 hover:bg-stone-100 hover:text-stone-600"
              onClick={() => set(rows.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></button>
          )}
        </li>
      ))}
    </ul>
  );
}
