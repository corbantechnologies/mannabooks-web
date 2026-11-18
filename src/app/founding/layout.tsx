import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Become a MannaBooks founding customer" },
  description: "A limited number of Kenyan businesses in each industry get MannaBooks at a founding price, in return for honest feedback.",
  alternates: { canonical: "/founding" },
};

export default function FoundingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
