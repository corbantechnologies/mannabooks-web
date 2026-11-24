"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Input } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

/**
 * "Warn me below": a minimum for a bank, M-Pesa or cash account. Below it the account is flagged in red, and finance
 * gets one email (again only after it recovers and falls again).
 */
export function MinBalance({ id, value, below, canEdit }: { id: string; value?: string | null; below: boolean; canEdit: boolean }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PATCH("/api/v1/w/{workspace}/bank-accounts/{id}/", {
      params: { path: { workspace: slug, id } }, body: { min_balance: draft === "" ? null : draft } as never,
    })),
    onSuccess: () => { toast.success(draft === "" ? "Warning removed" : "Warning set"); setEditing(false); void qc.invalidateQueries(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className={`mb-4 flex flex-wrap items-center gap-2 rounded-md px-3 py-2 text-sm ${below ? "bg-red-50 text-red-800" : "bg-stone-50 text-stone-700"}`}>
      {below && <CircleAlert className="h-4 w-4" />}
      {editing ? (
        <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <span>Warn me when the balance falls below</span>
          <Input autoFocus type="number" min="0" step="0.01" className="w-36 py-1" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Blank: no warning" />
          <button type="submit" disabled={save.isPending} className="rounded-md bg-brand-700 px-3 py-1 text-white disabled:opacity-60">Save</button>
          <button type="button" className="text-stone-500 hover:underline" onClick={() => setEditing(false)}>Cancel</button>
        </form>
      ) : (
        <>
          <span>{value ? (below ? `Below its minimum of ${fmt(value)}` : `Warns below ${fmt(value)}`) : "No low-balance warning"}</span>
          {canEdit && <button type="button" className="text-brand-700 hover:underline" onClick={() => { setDraft(value ?? ""); setEditing(true); }}>{value ? "Change" : "Set one"}</button>}
        </>
      )}
    </div>
  );
}
