"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, UserPlus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { useWorkspace, wsPath } from "@/lib/workspace";
import { ask } from "@/components/confirm";

export default function TeamPage() {
  const { slug, can, context } = useWorkspace();
  const limitedMe = Boolean(context.limited_department);
  const p = wsPath(slug);
  const [inviting, setInviting] = useState(false);
  const [invite, setInvite] = useState({ email: "", role_id: "" });

  const members = useQuery({ queryKey: ["members", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/members/", p)) });
  const roles = useQuery({ queryKey: ["roles", slug], enabled: can("roles.view") || can("members.manage"), queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/roles/", p)) });
  const depts = useQuery({ queryKey: ["departments", slug], enabled: can("members.manage"), queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/departments/", p)) });
  const departments = (depts.data?.results ?? []) as { id: string; name: string }[];
  const invitations = useQuery({
    queryKey: ["invitations", slug],
    enabled: can("invitations.view"),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/invitations/", { params: { path: { workspace: slug }, query: { status: "pending" } } })),
  });

  const update = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: { role_id?: string; status?: "active" | "suspended"; limited_department_id?: string | null } }) =>
      unwrap(await api.PATCH("/api/v1/w/{workspace}/members/{id}/", { params: { path: { workspace: slug, id } }, body })),
    onSuccess: () => toast.success("Member updated"),
    onError: (e) => toast.error(e.message),
  });
  const removeMember = useMutation({
    mutationFn: async (id: string) => unwrap(await api.DELETE("/api/v1/w/{workspace}/members/{id}/", { params: { path: { workspace: slug, id } } })),
    onSuccess: () => toast.success("Member removed"),
    onError: (e) => toast.error(e.message),
  });
  const send = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/invitations/", { ...p, body: invite })),
    onSuccess: (inv) => { toast.success(`Invitation sent to ${inv.email}`); setInviting(false); setInvite({ email: "", role_id: "" }); },
  });
  const revoke = useMutation({
    mutationFn: async (id: string) => unwrap(await api.DELETE("/api/v1/w/{workspace}/invitations/{id}/", { params: { path: { workspace: slug, id } } })),
    onSuccess: () => toast.success("Invitation revoked"),
    onError: (e) => toast.error(e.message),
  });

  const manage = can("members.manage");
  const roleList = roles.data?.results ?? [];
  const pending = invitations.data?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team and access"
        description="Who can sign in to this workspace, and with which role. People join by invitation."
        guide="team-and-roles"
        actions={can("invitations.manage") && <Button onClick={() => { send.reset(); setInviting(true); }}><UserPlus className="h-4 w-4" /> Invite</Button>}
      />
      <Card>
        {members.isLoading ? <div className="px-4"><Spinner /></div> : members.error ? <div className="p-4"><ErrorState error={members.error} /></div> : (
          <Table head={["Name", "Email", "Role", "Sees", "Status", ""]}>
            {(members.data?.results ?? []).map((m) => (
              <tr key={m.id}>
                <Td className="font-medium">{m.user.full_name}</Td>
                <Td>{m.user.email}</Td>
                <Td>
                  {manage && roleList.length ? (
                    <Select className="max-w-44 py-1" value={m.role_id} onChange={(e) => update.mutate({ id: m.id, body: { role_id: e.target.value } })}>
                      {roleList.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </Select>
                  ) : m.role_name}
                </Td>
                <Td>
                  {manage && !limitedMe && m.id !== context.membership_id && m.role_name !== "Owner" && departments.length ? (
                    <Select className="max-w-44 py-1" value={m.limited_department_id ?? ""} aria-label={`What ${m.user.full_name} sees`}
                      onChange={(e) => update.mutate({ id: m.id, body: { limited_department_id: e.target.value || null } })}>
                      <option value="">Whole business</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>Only {d.name}</option>)}
                    </Select>
                  ) : m.limited_department_name ? `Only ${m.limited_department_name}` : "Whole business"}
                </Td>
                <Td>{m.status === "active" ? <Badge tone="green">Active</Badge> : <Badge tone="amber">Suspended</Badge>}</Td>
                <Td className="whitespace-nowrap text-right">
                  {manage && (
                    <>
                      <Button variant="ghost" className="px-2 py-1" onClick={() => update.mutate({ id: m.id, body: { status: m.status === "active" ? "suspended" : "active" } })}>
                        {m.status === "active" ? "Suspend" : "Reactivate"}
                      </Button>
                      <Button variant="ghost" className="px-2 py-1 text-red-600" onClick={() => void ask(`Remove ${m.user.full_name} from this workspace?`).then((ok) => ok && removeMember.mutate(m.id))}>
                        Remove
                      </Button>
                    </>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {can("invitations.view") && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-stone-900">Pending invitations</h2>
          <Card>
            {invitations.isLoading ? <div className="px-4"><Spinner /></div> : pending.length === 0 ? (
              <EmptyState title="No pending invitations" />
            ) : (
              <Table head={["Email", "Role", "Invited by", "Expires", ""]}>
                {pending.map((inv) => (
                  <tr key={inv.id}>
                    <Td>{inv.email} {inv.is_expired && <Badge tone="red">Expired</Badge>}</Td>
                    <Td>{inv.role_name}</Td>
                    <Td>{inv.invited_by || "-"}</Td>
                    <Td>{new Date(inv.expires_at).toLocaleDateString("en-KE")}</Td>
                    <Td className="whitespace-nowrap text-right">
                      <Button variant="ghost" className="px-2 py-1" title="Copy the invitation link" onClick={() => navigator.clipboard.writeText(inv.link).then(() => toast.success("Link copied"))}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      {can("invitations.manage") && (
                        <Button variant="ghost" className="px-2 py-1 text-red-600" onClick={() => revoke.mutate(inv.id)}>Revoke</Button>
                      )}
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
      )}

      <Modal open={inviting} title="Invite someone" onClose={() => setInviting(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
          <Field label="Email" error={fieldError(send.error, "email")}>
            <Input type="email" required value={invite.email} onChange={(e) => setInvite((prev) => ({ ...prev, email: e.target.value }))} />
          </Field>
          <Field label="Role" error={fieldError(send.error, "role_id")}>
            <Select required value={invite.role_id} onChange={(e) => setInvite((prev) => ({ ...prev, role_id: e.target.value }))}>
              <option value="">Choose a role</option>
              {roleList.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </Field>
          <p className="text-xs text-stone-500">They get an email with a link that works for 7 days. To give an employee self-service, use Invite to sign in on their employee record instead, so the login is linked to it.</p>
          <FormError error={send.error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setInviting(false)}>Cancel</Button>
            <Button type="submit" loading={send.isPending}>Send invitation</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
