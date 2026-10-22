"use client";

import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "./ui";

export interface MenuAction {
  label: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  /** Leave out of the menu (e.g. no permission). */
  hidden?: boolean;
}

/**
 * Secondary actions in one "More" menu, so a document page shows only its main action as a button.
 * Closes on a choice, a click outside or Escape.
 */
export function ActionMenu({ actions, label = "More" }: { actions: MenuAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  const shown = actions.filter((a) => !a.hidden);
  if (!shown.length) return null;
  const item = (a: MenuAction) => clsx("block w-full px-3 py-2 text-left text-sm hover:bg-stone-50 max-sm:px-4 max-sm:py-3 max-sm:text-base", a.danger ? "text-red-600" : "text-stone-800");
  return (
    <div className="relative" ref={box}>
      <Button variant="secondary" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
        {label} <ChevronDown className="h-4 w-4" />
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-60 rounded-md border border-stone-200 bg-white py-1 shadow-lg max-sm:fixed max-sm:inset-x-3 max-sm:bottom-3 max-sm:top-auto max-sm:mt-0 max-sm:w-auto max-sm:rounded-xl max-sm:py-2 max-sm:shadow-2xl">
          {shown.map((a) => a.href ? (
            <Link key={a.label} role="menuitem" href={a.href} className={item(a)} onClick={() => setOpen(false)}>{a.label}</Link>
          ) : (
            <button key={a.label} role="menuitem" type="button" className={item(a)} onClick={() => { setOpen(false); a.onClick?.(); }}>{a.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
