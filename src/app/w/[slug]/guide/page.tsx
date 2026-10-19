import { GuideCards } from "@/components/guide-article";
import { GUIDES } from "@/content/guides";

export default async function WorkspaceGuides({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold text-stone-900">User guides</h1>
      <p className="mt-1 text-sm text-stone-600">How each part of MannaBooks works. Every screen&apos;s Guide button opens its guide here.</p>
      <GuideCards guides={GUIDES} base={`/w/${slug}/guide`} />
    </div>
  );
}
