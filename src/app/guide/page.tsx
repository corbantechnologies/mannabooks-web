import type { Metadata } from "next";

import { GuideCards } from "@/components/guide-article";
import { PUBLIC_GUIDES } from "@/content/guides";

export const metadata: Metadata = { title: "User guides" };

export default function GuideIndex() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">User guides</h1>
      <p className="mt-1 text-sm text-stone-600">How each part of MannaBooks works. New guides arrive with each module.</p>
      <GuideCards guides={PUBLIC_GUIDES} base="/guide" />
    </div>
  );
}
