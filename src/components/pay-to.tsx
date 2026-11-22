"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/**
 * A supplier's bank and M-Pesa details, laid out to pay from: each "Label: value" line as a row, with a Copy button on
 * anything with a number in it (account, paybill, till, SWIFT code). Lines without a label show as they are. Blank lines
 * start a new group, such as a second bank.
 */
export function PayTo({ details }: { details: string }) {
  const groups = details.split(/\n\s*\n/).map((g) => g.split("\n").map((l) => l.trim()).filter(Boolean)).filter((g) => g.length);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((lines, gi) => (
        <dl key={gi} className="rounded-lg border border-stone-200 bg-stone-50/60 p-3 text-sm">
          {lines.map((line, li) => {
            const at = line.indexOf(":");
            const label = at > 0 && at < 40 ? line.slice(0, at).trim() : "";
            const value = label ? line.slice(at + 1).trim() : line;
            return (
              <div key={li} className="flex items-start justify-between gap-2 py-0.5">
                <div className="min-w-0">
                  {label && <dt className="text-xs text-stone-500">{label}</dt>}
                  <dd className={label ? "break-words font-medium text-stone-900" : "break-words text-stone-700"}>{value}</dd>
                </div>
                {/[0-9]{3,}|^[A-Z0-9]{8,11}$/.test(value) && <CopyButton text={value} />}
              </div>
            );
          })}
        </dl>
      ))}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" aria-label={`Copy ${text}`} title="Copy"
      className="mt-3 shrink-0 rounded p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700"
      onClick={() => void navigator.clipboard?.writeText(text).then(() => { setDone(true); window.setTimeout(() => setDone(false), 1500); })}>
      {done ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

/** What to type, shown in the empty box: one detail per line, a blank line between accounts. */
export const PAY_TO_EXAMPLE = `Bank: NCBA Bank Kenya
Branch: Nyali
Account name: Example Ltd
KES account: 1234567890
USD account: 1234567891
SWIFT: CBAFKENX

M-Pesa paybill: 4012881
Account number: Invoice number`;
