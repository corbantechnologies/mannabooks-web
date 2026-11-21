"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Visit = { path: string; title: string };

// the page being looked at now, and the one before it, kept across page changes within the app
let current: Visit | null = null;
let previous: Visit | null = null;

const ID = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/|$)/i;

/**
 * "Back to <where you were>" on a record's page, when you got there from somewhere other than its own list: from a
 * customer's profile to one of their invoices, the back link returns to the customer, not to all invoices.
 */
export function CameFrom() {
  const pathname = usePathname();
  const router = useRouter();
  const [back, setBack] = useState<Visit | null>(null);

  useEffect(() => {
    if (previous?.path === pathname) {
      // went back: don't offer to go "back" to the page just left
      current = previous;
      previous = null;
    } else if (current?.path !== pathname) {
      previous = current;
      current = { path: pathname, title: "" };
    }
    // the heading is on screen once the page has loaded its record
    const read = window.setTimeout(() => {
      const h1 = document.querySelector("main h1")?.textContent?.trim() ?? "";
      if (current?.path === pathname) current.title = h1;
    }, 800);
    const list = pathname.replace(/\/[^/]+$/, "");  // the record's own list, which its page already links to
    const show = previous && ID.test(pathname) && previous.path !== pathname && previous.path !== list && previous.title ? previous : null;
    setBack(show);  // eslint-disable-line react-hooks/set-state-in-effect -- follows the route, set once per page change
    return () => window.clearTimeout(read);
  }, [pathname]);

  if (!back) return null;
  return (
    <button type="button" onClick={() => router.back()} className="mb-1 inline-flex max-w-full items-center gap-1 text-sm text-brand-700 hover:underline print:hidden">
      <ArrowLeft className="h-3.5 w-3.5 shrink-0" /><span className="truncate">Back to {back.title}</span>
    </button>
  );
}
