import type { Metadata } from "next";
import Link from "next/link";

import { TopBar } from "@/components/top-bar";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <>
      <TopBar />
      <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <p className="font-mono text-sm font-semibold text-brand-700">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-sm text-stone-600">
          The link may be old or mistyped, or the record was deleted. Check the address, or start again from your workspaces.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/workspaces" className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Your workspaces</Link>
          <Link href="/guide" className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">User guides</Link>
        </div>
      </main>
    </>
  );
}
