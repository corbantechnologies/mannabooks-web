"use client";

import Link from "next/link";
import { useState } from "react";

import { fmtDate } from "@/lib/format";
import { grants, useWorkspace } from "@/lib/workspace";

/** One line at the top of every page when the business is blocked, read-only, due to pay, or near the end of its trial. */
export function SubscriptionBanner() {
  const { slug, context } = useWorkspace();
  const [now] = useState(() => Date.now());
  const sub = context.subscription;
  const manage = grants(context.permissions, "workspace.manage");
  const billing = manage ? <Link href={`/w/${slug}/billing`} className="font-medium underline">Plan and billing</Link> : "Ask the owner to pay.";
  if (context.blocked) {
    return (
      <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        MannaBooks has blocked this business: {context.blocked_reason || "contact MannaBooks"}. You can still reach us through{" "}
        <Link href={`/w/${slug}/help`} className="font-medium underline">Help and feedback</Link>.
      </div>
    );
  }
  if (!sub) return null; // an API older than billing sends no subscription
  if (sub.status === "read_only") {
    return <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">This business is read-only until the subscription is paid: you can see and export everything, but not change it. {billing}</div>;
  }
  if (sub.status === "past_due") {
    return <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">The {sub.plan_name} plan was paid up to {fmtDate(sub.paid_until)}. Pay soon to keep using it without interruption. {billing}</div>;
  }
  if (sub.status === "trialing" && sub.trial_ends_on) {
    const days = Math.ceil((new Date(sub.trial_ends_on).getTime() - now) / 86400000);
    if (days <= 7) {
      return (
        <div className="mb-4 rounded-md border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          Your free trial of every feature ends {days <= 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}. Then the business moves to the Free plan unless you choose a paid one. {billing}
        </div>
      );
    }
  }
  return null;
}
