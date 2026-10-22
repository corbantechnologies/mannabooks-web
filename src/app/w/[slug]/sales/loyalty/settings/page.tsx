"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import type { LoyaltyProgram, LoyaltyTier } from "@/lib/api/types";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function LoyaltySettingsPage() {
  const { slug } = useWorkspace();
  const program = useQuery({ queryKey: ["loyalty-program", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/loyalty/program/", wsPath(slug))) });
  return (
    <div className="space-y-6">
      <Link href={`/w/${slug}/sales/loyalty`} className="text-sm text-stone-500 hover:underline">&larr; Loyalty</Link>
      <PageHeader title="Loyalty settings" description="How points are earned and spent, and the tiers members move up through." guide="loyalty" />
      {program.isLoading ? <Spinner /> : program.error ? <ErrorState error={program.error} /> : <ProgramForm program={program.data!} />}
      <Tiers />
    </div>
  );
}

function ProgramForm({ program }: { program: LoyaltyProgram }) {
  const { slug, context } = useWorkspace();
  const cur = context.workspace.currency;
  const [form, setForm] = useState({
    name: program.name ?? "Rewards", is_active: program.is_active ?? false, spend_per_point: String(Number(program.spend_per_point ?? 100)),
    point_value: String(Number(program.point_value ?? 1)), min_redeem_points: program.min_redeem_points ?? 100,
    max_redeem_percent: program.max_redeem_percent ?? 50, expiry_months: program.expiry_months ?? 12, earn_on_invoices: program.earn_on_invoices ?? true,
  });
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PUT("/api/v1/w/{workspace}/loyalty/program/", { ...wsPath(slug), body: form })),
    onSuccess: () => toast.success("Loyalty settings saved"),
  });
  const num = (key: "min_redeem_points" | "max_redeem_percent" | "expiry_months") => (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [key]: Number(e.target.value) }));
  const rate = Number(form.point_value) / Number(form.spend_per_point) * 100;
  return (
    <Card className="p-5">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Programme name"><Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} /></Field>
          <Field label={`${cur} spent for 1 point`} hint="Before VAT." error={fieldError(save.error, "spend_per_point")}><Input inputMode="decimal" value={form.spend_per_point} onChange={(e) => setForm((prev) => ({ ...prev, spend_per_point: e.target.value }))} /></Field>
          <Field label={`1 point is worth (${cur})`} error={fieldError(save.error, "point_value")}><Input inputMode="decimal" value={form.point_value} onChange={(e) => setForm((prev) => ({ ...prev, point_value: e.target.value }))} /></Field>
          <Field label="Least points to redeem"><Input type="number" min={0} value={form.min_redeem_points} onChange={num("min_redeem_points")} /></Field>
          <Field label="Points can pay up to (% of a sale)" error={fieldError(save.error, "max_redeem_percent")}><Input type="number" min={1} max={100} value={form.max_redeem_percent} onChange={num("max_redeem_percent")} /></Field>
          <Field label="Points expire after (months)" hint="0: never."><Input type="number" min={0} value={form.expiry_months} onChange={num("expiry_months")} /></Field>
        </div>
        <p className="text-sm text-stone-600">Customers get back about {Number.isFinite(rate) ? rate.toFixed(1) : "0"}% of what they spend (more in higher tiers).</p>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.earn_on_invoices} onChange={(e) => setForm((prev) => ({ ...prev, earn_on_invoices: e.target.checked }))} /> Also earn points on invoices (not only cash sales)</label>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} /> Loyalty programme is on</label>
        <FormError error={save.error} />
        <Button type="submit" loading={save.isPending}>Save settings</Button>
      </form>
    </Card>
  );
}

function Tiers() {
  const { slug } = useWorkspace();
  const tiers = useQuery({ queryKey: ["loyalty-tiers", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/loyalty/tiers/", wsPath(slug))) });
  const [editing, setEditing] = useState<LoyaltyTier | "new" | null>(null);
  const [form, setForm] = useState({ name: "", min_points: 0, multiplier: "1", perks: "" });
  const save = useMutation({
    mutationFn: async () => {
      if (editing === "new") return unwrap(await api.POST("/api/v1/w/{workspace}/loyalty/tiers/", { ...wsPath(slug), body: form }));
      return unwrap(await api.PATCH("/api/v1/w/{workspace}/loyalty/tiers/{id}/", { params: { path: { workspace: slug, id: (editing as LoyaltyTier).id } }, body: form }));
    },
    onSuccess: () => { toast.success("Tier saved; members regraded"); setEditing(null); },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await api.DELETE("/api/v1/w/{workspace}/loyalty/tiers/{id}/", { params: { path: { workspace: slug, id } } })),
    onSuccess: () => { toast.success("Tier deleted"); setEditing(null); },
  });
  function open(t: LoyaltyTier | "new") {
    save.reset();
    setForm(t === "new" ? { name: "", min_points: 0, multiplier: "1", perks: "" } : { name: t.name, min_points: t.min_points ?? 0, multiplier: String(Number(t.multiplier)), perks: t.perks ?? "" });
    setEditing(t);
  }
  const rows = tiers.data?.results ?? [];
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Tiers</h2>
        <Button variant="ghost" className="px-2 py-1" onClick={() => open("new")}><Plus className="h-4 w-4" /> Add tier</Button>
      </div>
      <Card>
        {rows.length === 0 ? <EmptyState title="No tiers">Everyone earns at the same rate. Add tiers such as Silver and Gold to reward regulars.</EmptyState> : (
          <Table head={["Tier", "From (points in 12 months)", "Earns", "Members"]}>
            {rows.map((t) => (
              <tr key={t.id} className="cursor-pointer hover:bg-stone-50" onClick={() => open(t)}>
                <Td className="font-medium">{t.name}{t.perks ? <span className="text-stone-500"> · {t.perks}</span> : null}</Td>
                <Td className="text-right">{t.min_points}</Td>
                <Td className="text-right">{Number(t.multiplier)}x</Td>
                <Td className="text-right">{t.member_count}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={editing !== null} title={editing && editing !== "new" ? editing.name : "New tier"} onClose={() => setEditing(null)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Name" error={fieldError(save.error, "name")}><Input required value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Gold" /></Field>
            <Field label="From points" error={fieldError(save.error, "min_points")}><Input type="number" min={0} value={form.min_points} onChange={(e) => setForm((prev) => ({ ...prev, min_points: Number(e.target.value) }))} /></Field>
            <Field label="Earn rate" hint="1.5 = 50% more." error={fieldError(save.error, "multiplier")}><Input inputMode="decimal" value={form.multiplier} onChange={(e) => setForm((prev) => ({ ...prev, multiplier: e.target.value }))} /></Field>
          </div>
          <Field label="Perks (shown to staff)"><Input value={form.perks} onChange={(e) => setForm((prev) => ({ ...prev, perks: e.target.value }))} placeholder="Free delivery" /></Field>
          <FormError error={save.error ?? remove.error} />
          <div className="flex justify-between gap-2">
            {editing && editing !== "new" ? <Button type="button" variant="ghost" className="text-red-600" onClick={() => confirm("Delete this tier?") && remove.mutate(editing.id)}>Delete</Button> : <span />}
            <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
