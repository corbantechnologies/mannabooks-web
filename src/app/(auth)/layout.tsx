import Link from "next/link";

import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <Link href="/" className="mb-6" aria-label="MannaBooks home">
        <Logo size="lg" />
      </Link>
      <div className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-5 shadow-sm sm:p-6 sm:has-[[data-wide]]:max-w-2xl sm:has-[[data-wide]]:p-8">{children}</div>
      <p className="mt-6 text-xs text-stone-500">
        Need help? Read the <Link href="/guide/getting-started" className="underline">getting started guide</Link>.
      </p>
    </div>
  );
}
