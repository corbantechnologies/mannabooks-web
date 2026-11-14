import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pay",
  robots: { index: false, follow: false },  // private links: never in search results
};

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-stone-50">{children}</div>;
}
