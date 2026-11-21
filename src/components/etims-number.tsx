"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { Input } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace } from "@/lib/workspace";

/**
 * The CU number of the eTIMS invoice raised on KRA's own portal or app for this invoice, typed in after issuing while
 * signing from MannaBooks is off. Searchable, and what customers and KRA check. Locked once KRA signed it through us.
 */
export function EtimsNumber({ id, value, signed, canEdit }: { id: string; value?: string | null; signed: boolean; canEdit: boolean }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/invoices/{id}/etims-number/", {
      params: { path: { workspace: slug, id } }, body: { etims_cu_invoice_number: draft },
    })),
    onSuccess: () => { toast.success("eTIMS number saved"); setEditing(false); void qc.invalidateQueries({ queryKey: ["invoice"] }); },
    onError: (e) => toast.error(e.message),
  });
  if (signed) return null;  // KRA's own number shows with the eTIMS status
  return (
    <div>
      <p className="text-xs text-stone-500">eTIMS invoice no.</p>
      {editing ? (
        <form className="mt-1 flex gap-1" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <Input autoFocus className="py-1 font-mono text-xs" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="CU invoice number" />
          <button type="submit" className="rounded-md bg-brand-700 px-2 text-xs font-medium text-white disabled:opacity-60" disabled={save.isPending}>Save</button>
        </form>
      ) : (
        <p className="text-sm">
          {value ? <span className="font-mono text-xs">{value}</span> : <span className="text-stone-400">Not added</span>}
          {canEdit && <button type="button" className="ml-2 text-xs text-brand-700 hover:underline" onClick={() => { setDraft(value ?? ""); setEditing(true); }}>{value ? "Change" : "Add"}</button>}
        </p>
      )}
    </div>
  );
}
