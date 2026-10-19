import Link from "next/link";

import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8" aria-label="MannaBooks home">
        <Logo size="lg" />
      </Link>
      <div className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-6 shadow-sm">{children}</div>
      <p className="mt-6 text-xs text-stone-500">
        Need help? Read the <Link href="/guide/getting-started" className="underline">getting started guide</Link>.
      </p>
    </div>
  );
}
