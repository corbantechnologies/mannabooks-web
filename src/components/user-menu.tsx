"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export function UserMenu() {
  const { data } = useSession();
  const [open, setOpen] = useState(false);
  const name = data?.user?.name || data?.user?.email || "Account";
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-stone-700 hover:bg-stone-100"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-40 truncate sm:inline">{name}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-48 rounded-md border border-stone-200 bg-white py-1 shadow-lg" onMouseLeave={() => setOpen(false)}>
          <Link href="/account" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-stone-50">
            <UserRound className="h-4 w-4" /> My account
          </Link>
          <button
            onClick={async () => {
              await fetch("/api/session/logout", { method: "POST" });
              signOut({ callbackUrl: "/signin" });
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-stone-50"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
