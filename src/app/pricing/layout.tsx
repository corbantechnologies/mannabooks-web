import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Pricing: MannaBooks plans in shillings" },
  description: "Start free, then choose Biashara, Duka or Kampuni. Every new business gets 30 days of every feature. Pay monthly or yearly by M-Pesa.",
  alternates: { canonical: "/pricing" },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
