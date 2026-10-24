"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { ask } from "@/components/confirm";

type Action = "block" | "unblock" | "grant_full_access" | "revoke_full_access" | "make_staff" | "remove_staff";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [show, setShow] = useState("");
  const [granting, setGranting] = useState<{ id: string; name: string } | null>(null);
  const [note, setNote] = useState("");
  const list = useQuery({
    queryKey: ["platform-users", search, show],
    queryFn: async () => unwrap(await api.GET("/api/v1/platform/users/", { params: { query: { search: search || undefined, show: show || undefined, page_size: 100 } as never } })),
  });
  const act = useMutation({
    mutationFn: async ({ id, action, note: n }: { id: string; action: Action; note?: string }) =>
      unwrap(await api.POST("/api/v1/platform/users/{id}/action/", { params: { path: { id } }, body: { action, note: n ?? "" } })),
    onSuccess: (u) => { toast.success(`${u.full_name} updated`); setGranting(null); setNote(""); },
    onError: (e) => toast.error(e.message),
  });
  const rows = list.data?.results ?? [];
  return (
    <div className="w-full">
      <PageHeader title="Users" description="Everyone with a MannaBooks login. Full access puts every business a person owns on the top plan, free, including ones they start later." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-sm" placeholder="Name, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select className="max-w-44" value={show} onChange={(e) => setShow(e.target.value)}>
          <option value="">Everyone</option><option value="full_access">Full access</option><option value="staff">MannaBooks staff</option><option value="blocked">Blocked</option>
        </Select>
      </div>
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? <EmptyState title="No users match" /> : (
          <Table head={["Person", "Owns", "Belongs to", "Access", "Joined", "Last sign-in", ""]}>
            {rows.map((u) => (
              <tr key={u.id}>
                <Td>{u.full_name}<div className="text-xs text-stone-500">{u.email}{u.phone ? ` · ${u.phone}` : ""}</div></Td>
                <Td className="text-right">{u.businesses}</Td>
                <Td className="text-right">{u.memberships_count}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {!u.is_active && <Badge tone="red">Blocked</Badge>}
                    {u.is_staff && <Badge tone="blue">{u.is_superuser ? "Superuser" : "Staff"}</Badge>}
                    {u.full_access && <Badge tone="green">Full access</Badge>}
                  </div>
                  {u.full_access_note && <div className="text-xs text-stone-500">{u.full_access_note}</div>}
                </Td>
                <Td className="text-stone-500">{fmtDate(u.date_joined)}</Td>
                <Td className="text-stone-500">{u.last_login ? fmtDate(u.last_login) : "-"}</Td>
                <Td className="whitespace-nowrap text-xs">
                  {u.full_access
                    ? <button type="button" className="text-stone-700 hover:underline" onClick={() => void ask(`Take back full access from ${u.full_name}? Their businesses go back to normal billing.`).then((ok) => ok && act.mutate({ id: u.id, action: "revoke_full_access" }))}>End full access</button>
                    : <button type="button" className="text-brand-700 hover:underline" onClick={() => setGranting({ id: u.id, name: u.full_name })}>Give full access</button>}
                  {" · "}
                  {u.is_active
                    ? <button type="button" className="text-red-600 hover:underline" onClick={() => void ask(`Block ${u.full_name} from signing in?`).then((ok) => ok && act.mutate({ id: u.id, action: "block" }))}>Block</button>
                    : <button type="button" className="text-brand-700 hover:underline" onClick={() => act.mutate({ id: u.id, action: "unblock" })}>Unblock</button>}
                  {" · "}
                  <button type="button" className="text-stone-600 hover:underline" onClick={() => act.mutate({ id: u.id, action: u.is_staff ? "remove_staff" : "make_staff" })}>{u.is_staff ? "Remove staff" : "Make staff"}</button>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={granting !== null} title={`Give ${granting?.name ?? ""} full access`} onClose={() => setGranting(null)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); act.mutate({ id: granting!.id, action: "grant_full_access", note }); }}>
          <p className="text-sm text-stone-600">Every business this person owns, now and later, goes on the top plan with nothing to pay. Businesses they only belong to aren&apos;t affected.</p>
          <Field label="Why?" hint="Kept with the account, e.g. partner accountant, MannaBooks team, sponsor."><Input required value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <FormError error={act.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setGranting(null)}>Cancel</Button><Button type="submit" loading={act.isPending}>Give full access</Button></div>
        </form>
      </Modal>
    </div>
  );
}
