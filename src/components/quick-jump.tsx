"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export type JumpItem = { href: string; label: string; section?: string; icon: React.ComponentType<{ className?: string }>; pinned?: boolean };

/** Ctrl+K (Cmd+K on a Mac), or the search button: type part of a page's name and press Enter to go there. */
export function QuickJump({ items }: { items: JumpItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Find a page (Ctrl+K)" aria-label="Find a page"
        className="flex items-center gap-2 rounded-md border border-stone-200 px-2 py-1 text-sm text-stone-500 hover:bg-stone-50">
        <Search className="h-4 w-4" /><span className="hidden lg:inline">Find a page</span>
        <kbd className="hidden rounded border border-stone-200 bg-stone-50 px-1 text-[10px] font-medium text-stone-500 lg:inline">Ctrl K</kbd>
      </button>
      {open && <Palette items={items} onClose={() => setOpen(false)} go={(href) => { setOpen(false); router.push(href); }} />}
    </>
  );
}

function score(item: JumpItem, words: string[]) {
  const label = item.label.toLowerCase();
  const all = `${label} ${(item.section ?? "").toLowerCase()}`;
  if (!words.every((w) => all.includes(w))) return -1;
  let s = 0;
  if (label.startsWith(words[0])) s += 10;
  if (label.split(/\s+/).some((w) => w.startsWith(words[0]))) s += 5;
  if (item.pinned) s += 3;
  return s - label.length / 100;
}

function Palette({ items, onClose, go }: { items: JumpItem[]; onClose: () => void; go: (href: string) => void }) {
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [...items.filter((i) => i.pinned), ...items.filter((i) => !i.pinned)].slice(0, 12);
    return items.map((i) => ({ i, s: score(i, words) })).filter((r) => r.s >= 0).sort((a, b) => b.s - a.s).slice(0, 12).map((r) => r.i);
  }, [items, q]);
  const pick = Math.min(at, Math.max(results.length - 1, 0));
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setAt((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAt((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && results[pick]) { e.preventDefault(); go(results[pick].href); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-stone-900/40 p-3 pt-[12vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-label="Find a page" className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center gap-2 border-b border-stone-200 px-3">
          <Search className="h-4 w-4 text-stone-400" />
          <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setAt(0); }} onKeyDown={onKey}
            placeholder="Find a page: tasks, invoices, payroll..." className="w-full py-3 text-sm outline-none" aria-label="Page name" />
        </div>
        <ul className="max-h-80 overflow-y-auto py-1" role="listbox">
          {results.length === 0 && <li className="px-4 py-3 text-sm text-stone-500">No page called that.</li>}
          {results.map((r, i) => {
            const Icon = r.icon;
            return (
              <li key={r.href} role="option" aria-selected={i === pick}>
                <button type="button" onMouseEnter={() => setAt(i)} onClick={() => go(r.href)}
                  className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm ${i === pick ? "bg-brand-50 text-brand-800" : "text-stone-700"}`}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{r.label}</span>
                  {r.section && <span className="text-xs text-stone-400">{r.section}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-stone-100 px-4 py-2 text-xs text-stone-400">Up and down to choose, Enter to open, Esc to close.</p>
      </div>
    </div>
  );
}
