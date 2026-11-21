"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Visit = { path: string; title: string };

// the pages visited in this tab, most recent last, kept across page changes within the app
const trail: Visit[] = [];

const ID = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/|$)/i;
const FORM = /\/(new|edit)$/;

/** A record's page or a form: the places where "back to the list" is often not where you came from. */
const deep = (path: string) => ID.test(path) || FORM.test(path);

/**
 * "Back to <where you were>" when you reached a record or a form from somewhere other than its own list: from a
 * supplier to Enter bill, the back link returns to the supplier, not to all bills. A form you have just saved is
 * skipped, so after saving a bill it still goes back to the supplier.
 */
export function CameFrom() {
  const pathname = usePathname();
  const router = useRouter();
  const [back, setBack] = useState<Visit | null>(null);

  useEffect(() => {
    const full = pathname + window.location.search;
    if (trail.length >= 2 && trail[trail.length - 2].path === full) trail.pop();  // went back one step
    else if (trail[trail.length - 1]?.path !== full) trail.push({ path: full, title: "" });
    if (trail.length > 20) trail.shift();
    // the heading is on screen once the page has loaded its record
    const read = window.setTimeout(() => {
      const h1 = document.querySelector("main h1")?.textContent?.trim() ?? "";
      const last = trail[trail.length - 1];
      if (last?.path === full) last.title = h1;
    }, 800);
    const list = pathname.replace(/\/[^/]+$/, "");  // the record's or form's own list, which its page already links to
    let show: Visit | null = null;
    if (deep(pathname)) {
      for (let i = trail.length - 2; i >= 0; i--) {
        const v = trail[i];
        const vPath = v.path.split("?")[0];
        if (FORM.test(vPath) || vPath === pathname) continue;  // skip forms already finished, and this page itself
        show = vPath !== list && v.title ? v : null;
        break;
      }
    }
    setBack(show);  // eslint-disable-line react-hooks/set-state-in-effect -- follows the route, set once per page change
    return () => window.clearTimeout(read);
  }, [pathname]);

  if (!back) return null;
  return (
    <button type="button" onClick={() => router.push(back.path)} className="mb-1 inline-flex max-w-full items-center gap-1 text-sm text-brand-700 hover:underline print:hidden">
      <ArrowLeft className="h-3.5 w-3.5 shrink-0" /><span className="truncate">Back to {back.title}</span>
    </button>
  );
}
