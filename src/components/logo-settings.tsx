"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import toast from "react-hot-toast";

import { ask } from "@/components/confirm";
import { Button, Card } from "@/components/ui";
import { sendForm } from "@/lib/api/assets";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace } from "@/lib/workspace";

const MAX = 1024 * 1024;

/** The business's logo: it shows on documents, PDFs, the online shop and the links customers open. */
export function LogoSettings() {
  const { slug, context, can } = useWorkspace();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const url = context.workspace.logo_url;
  const done = (msg: string) => { toast.success(msg); void qc.invalidateQueries({ queryKey: ["workspace-context", slug] }); };
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return sendForm(`/api/v1/w/${slug}/logo/`, form);
    },
    onSuccess: () => done("Logo uploaded"),
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/w/{workspace}/logo/", { params: { path: { workspace: slug } } })),
    onSuccess: () => done("Logo removed"),
    onError: (e) => toast.error(e.message),
  });
  const manage = can("workspace.manage");

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return void toast.error("Use a PNG, JPG or WebP picture.");
    if (file.size > MAX) return void toast.error("The logo is too big. Use a picture under 1 MB.");
    upload.mutate(file);
  }

  return (
    <Card className="p-5">
      <h2 className="font-semibold">Logo</h2>
      <p className="mt-1 text-sm text-stone-500">Shown on your quotations, invoices, PDFs, the online shop and the links customers open. PNG, JPG or WebP, under 1 MB. A wide logo on a white or clear background prints best.</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex h-20 w-48 items-center justify-center rounded-md border border-dashed border-stone-300 bg-stone-50 p-2">
          {url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={url} alt={`${context.workspace.name} logo`} className="max-h-full max-w-full object-contain" />
            : <span className="text-xs text-stone-400">No logo yet</span>}
        </div>
        {manage && (
          <div className="flex gap-2">
            <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={pick} />
            <Button loading={upload.isPending} onClick={() => input.current?.click()}>{url ? "Change logo" : "Upload logo"}</Button>
            {url && <Button variant="ghost" className="text-red-600" loading={remove.isPending}
              onClick={() => void ask("Remove the logo? Documents will show your business name instead.").then((ok) => ok && remove.mutate())}>Remove</Button>}
          </div>
        )}
      </div>
    </Card>
  );
}
