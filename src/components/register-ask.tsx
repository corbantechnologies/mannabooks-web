"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Field, FormError, Modal, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { useWorkspace } from "@/lib/workspace";

type Item = components["schemas"]["RegisterItem"];

/** Asking to use a register item (a login to a tool): the person responsible, or whoever manages registers, decides. */
export function AskAccess({ item, onClose }: { item: Item; onClose: () => void }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const go = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/registers/items/{id}/ask/", { params: { path: { workspace: slug, id: item.id } }, body: { reason } })),
    onSuccess: () => { toast.success(`Asked ${item.owner_name || "whoever manages registers"}`); void qc.invalidateQueries({ queryKey: ["register-items", slug] }); void qc.invalidateQueries({ queryKey: ["register-item", slug, item.id] }); onClose(); },
  });
  return (
    <Modal open title={`Ask for ${item.name}`} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); go.mutate(); }}>
        <p className="text-sm text-stone-600">{item.owner_name ? `${item.owner_name} is responsible for it and decides.` : "Whoever manages registers decides."}</p>
        <Field label="What you need it for"><Textarea required rows={2} maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <FormError error={go.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={go.isPending}>Ask</Button></div>
      </form>
    </Modal>
  );
}
