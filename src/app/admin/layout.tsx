"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Building2, CreditCard, History, LayoutDashboard, LifeBuoy, Tag, Ticket, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { TopBar } from "@/components/top-bar";
import { ErrorState, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/businesses", label: "Businesses", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/tickets", label: "Support tickets", icon: LifeBuoy },
  { href: "/admin/plans", label: "Plans", icon: Tag },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/log", label: "Admin log", icon: History },
];

/** The MannaBooks platform admin: only for MannaBooks staff (the API checks too). */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const me = useQuery({ queryKey: ["me"], queryFn: async () => unwrap(await api.GET("/api/v1/auth/me/")) });
  if (me.isLoading) return <><TopBar /><div className="px-6"><Spinner /></div></>;
  if (me.error) return <><TopBar /><div className="mx-auto max-w-xl p-8"><ErrorState error={me.error} /></div></>;
  if (!me.data?.is_staff) {
    return <><TopBar /><div className="mx-auto max-w-xl p-8 text-sm text-stone-600">This area is for MannaBooks staff. <Link href="/workspaces" className="text-brand-700 underline">Back to your workspaces</Link></div></>;
  }
  return (
    <>
      <TopBar><span className="rounded-md bg-stone-900 px-2 py-0.5 text-xs font-medium text-white">MannaBooks admin</span></TopBar>
      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-52 shrink-0 border-r border-stone-200 bg-white p-3 md:block">
          <nav className="space-y-0.5">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
              return (
                <Link key={href} href={href} className={clsx("flex items-center gap-2.5 rounded-md px-3 py-2 text-sm", active ? "bg-brand-50 font-medium text-brand-700" : "text-stone-600 hover:bg-stone-100")}>
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">
          <div className="mb-4 flex gap-2 overflow-x-auto md:hidden">{NAV.map((n) => <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-full border border-stone-200 px-3 py-1 text-xs">{n.label}</Link>)}</div>
          {children}
        </main>
      </div>
    </>
  );
}
