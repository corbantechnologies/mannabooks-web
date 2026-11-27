"use client";

/**
 * Forms with more than six fields are pages. On a list page, the address says which form is open (?form=new, or
 * ?form=<id> to change one), and the page shows that form as a page in place of the list (see AsPage in ui.tsx).
 * The back button closes it, a refresh keeps it, and the link can be shared.
 */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

export function useFormParam(key = "form"): [string | null, (v: string | null) => void] {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const value = sp.get(key);
  const set = useCallback((v: string | null) => {
    const q = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    if (v) q.set(key, v);
    else q.delete(key);
    const s = q.toString();
    router.push(s ? `${pathname}?${s}` : pathname);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, [router, pathname, key]);
  return [value, set];
}

/** A form that is open or not (?form=<name>). */
export function useFormFlag(name = "new", key = "form"): [boolean, (on: boolean) => void] {
  const [value, set] = useFormParam(key);
  return [value === name, useCallback((on: boolean) => set(on ? name : null), [set, name])];
}

/**
 * A form for a new item or one from the list (?form=new, ?form=<id>). `fill` loads the item into the form when it
 * opens, also after a refresh or the back and forward buttons, once the list has it.
 */
export function useFormItem<T extends { id: string }>(items: T[] | undefined, fill?: (v: T | "new") => void, key = "form"):
  [T | "new" | null, (v: T | "new" | null) => void] {
  const [value, set] = useFormParam(key);
  const current: T | "new" | null = value === "new" ? "new" : value ? (items ?? []).find((i) => i.id === value) ?? null : null;
  const filled = useRef<string | null>(null);
  const fillRef = useRef(fill);
  useEffect(() => { fillRef.current = fill; });
  useEffect(() => {
    if (!value) { filled.current = null; return; }
    if (filled.current === value || current === null) return;
    filled.current = value;
    fillRef.current?.(current);
  }, [value, current]);
  const open = useCallback((v: T | "new" | null) => {
    if (v !== null) {
      const id = v === "new" ? "new" : v.id;
      filled.current = id;
      fillRef.current?.(v);
      set(id);
    } else set(null);
  }, [set]);
  return [current, open];
}
