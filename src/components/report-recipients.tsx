"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Field, FormError, Modal, Select } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace } from "@/lib/workspace";

type Req = { id: string; people: { id: string; name: string }[]; requested_by_name?: string | null; copy_to_names: string[] };

/**
 * Change a work report request after it was set up: who is asked, whom the reports are for (work reports managers), and
 * who they also go to. People added get the current round; people taken off lose only rounds they haven't started.
 */
export function ReportRecipients({ req, open, onClose }: { req: Req; open: boolean; onClose: () => void }) {
  const { slug, can, context } = useWorkspace();
  const qc = useQueryClient();
  const members = useQuery({
    queryKey: ["members", slug, "active"], retry: false, enabled: open,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/members/", { params: { path: { workspace: slug }, query: { status: "active", page_size: 200 } as never } })),
  });
  const people = useQuery({ queryKey: ["report-people", slug], enabled: open,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/report-requests/people/", { params: { path: { workspace: slug } } })) });
  const all = members.data?.results ?? [];
  const idOf = (name?: string | null) => all.find((m) => m.user.full_name === name)?.id ?? "";
  const [asked, setAsked] = useState<string[]>(() => req.people.map((p) => p.id));
  const [forId, setForId] = useState<string | null>(null);
  const [copy, setCopy] = useState<string[] | null>(null);
  const copyIds = copy ?? req.copy_to_names.map(idOf).filter(Boolean);
  const choices = [...req.people, ...(people.data ?? []).filter((p) => !req.people.some((x) => x.id === p.id)).map((p) => ({ id: p.id, name: p.full_name }))];
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PATCH("/api/v1/w/{workspace}/report-requests/{id}/", {
      params: { path: { workspace: slug, id: req.id } },
      body: { people_ids: asked, copy_to_membership_ids: copyIds, ...(forId !== null ? { requested_for_membership_id: forId || null } : {}) } as never,
    })),
    onSuccess: () => { toast.success("Saved"); void qc.invalidateQueries({ queryKey: ["report-request", slug, req.id] }); onClose(); },
  });
  return (
    <Modal open={open} title="Change who" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        {can("workreports.manage") && all.length > 0 && (
          <Field label="Whom the reports are for" hint="They receive and review the reports.">
            <Select value={forId ?? idOf(req.requested_by_name)} onChange={(e) => setForId(e.target.value)}>
              {all.map((m) => <option key={m.id} value={m.id}>{m.id === context.membership_id ? `Me (${m.user.full_name})` : m.user.full_name}</option>)}
            </Select>
          </Field>
        )}
        {all.length > 0 && (
          <Field label="Also goes to" hint="They get every report and overdue note too.">
            <div className="flex max-h-40 flex-wrap gap-x-4 gap-y-1 overflow-y-auto rounded-md border border-stone-200 p-2">
              {all.map((m) => (
                <label key={m.id} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={copyIds.includes(m.id)} onChange={(e) => setCopy(e.target.checked ? [...copyIds, m.id] : copyIds.filter((x) => x !== m.id))} />
                  {m.user.full_name}
                </label>
              ))}
            </div>
          </Field>
        )}
        <Field label="Who is asked" hint="Someone added gets the current round now.">
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-stone-200 p-2">
            {choices.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={asked.includes(p.id)} onChange={(e) => setAsked((a) => (e.target.checked ? [...a, p.id] : a.filter((x) => x !== p.id)))} />
                {p.name}
              </label>
            ))}
          </div>
        </Field>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending} disabled={!asked.length}>Save</Button></div>
      </form>
    </Modal>
  );
}
