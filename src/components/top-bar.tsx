"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo, LogoMark } from "./logo";
import { UserMenu } from "./user-menu";

export function TopBar({ children }: { children?: React.ReactNode }) {
  const workspace = usePathname()?.match(/^\/w\/([^/]+)/)?.[1];  // inside a workspace, guides open in the app
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-stone-200 bg-white px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Link href="/workspaces" aria-label="MannaBooks, your workspaces" className="shrink-0">
          <LogoMark className="h-7 w-7 sm:hidden" />
          <Logo className="max-sm:hidden" />
        </Link>
        {children}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Link href={workspace ? `/w/${workspace}/guide` : "/guide"} className="rounded-md px-2.5 py-1.5 text-sm text-stone-600 hover:bg-stone-100 max-md:hidden">
          Guides
        </Link>
        <UserMenu />
      </div>
    </header>
  );
}
