"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "./logo";
import { UserMenu } from "./user-menu";

export function TopBar({ children }: { children?: React.ReactNode }) {
  const workspace = usePathname()?.match(/^\/w\/([^/]+)/)?.[1];  // inside a workspace, guides open in the app
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-stone-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <Link href="/workspaces" aria-label="MannaBooks, your workspaces">
          <Logo />
        </Link>
        {children}
      </div>
      <div className="flex items-center gap-1">
        <Link href={workspace ? `/w/${workspace}/guide` : "/guide"} className="rounded-md px-2.5 py-1.5 text-sm text-stone-600 hover:bg-stone-100">
          Guides
        </Link>
        <UserMenu />
      </div>
    </header>
  );
}
