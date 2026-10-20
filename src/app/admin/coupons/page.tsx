"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";

type Coupon = { id: string; code: string; description?: string; percent_off?: string; amount_off?: string; payments?: number | null; plan_keys?: string[]; valid_until?: string | null; max_redemptions?: number | null; times_redeemed: number; is_active?: boolean };

export default function CouponsPage() {
  const list = useQuery({ queryKey: ["platform-coupons"], queryFn: async () => unwrap(await api.GET("/api/v1/platform/coupons/", { params: { query: { page_size: 100 } as never } })) });
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const rows = (list.data?.results ?? []) as Coupon[];
  return (
    <div className="w-full">
      <PageHeader title="Coupons" description="Discount codes businesses enter when they pay: campaigns, partners, referrals." actions={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> New coupon</Button>} />
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? <EmptyState title="No coupons yet" /> : (
          <Table head={["Code", "Discount", "For", "Payments", "Used", "Valid until", ""]}>
            {rows.map((c) => (
              <tr key={c.id}>
                <Td><span className="font-mono font-medium">{c.code}</span> {!c.is_active && <Badge>Off</Badge>}<div className="text-xs text-stone-500">{c.description}</div></Td>
                <Td>{[Number(c.percent_off) ? `${Number(c.percent_off)}%` : "", Number(c.amount_off) ? `KES ${fmt(c.amount_off)}` : ""].filter(Boolean).join(" + ") || "-"}</Td>
                <Td className="text-stone-600">{c.plan_keys?.length ? c.plan_keys.join(", ") : "Any paid plan"}</Td>
                <Td>{c.payments ?? "Every"}</Td>
                <Td>{c.times_redeemed}{c.max_redemptions ? ` of ${c.max_redemptions}` : ""}</Td>
                <Td>{c.valid_until ? fmtDate(c.valid_until) : "-"}</Td>
                <Td><button type="button" className="text-xs text-brand-700 hover:underline" onClick={() => setEditing(c)}>Edit</button></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {editing && <EditCoupon coupon={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditCoupon({ coupon, onClose }: { coupon: Coupon | null; onClose: () => void }) {
  const [f, setF] = useState({
    code: coupon?.code ?? "", description: coupon?.description ?? "", percent_off: String(Number(coupon?.percent_off ?? 0)), amount_off: String(Number(coupon?.amount_off ?? 0)),
    payments: coupon?.payments != null ? String(coupon.payments) : "", plan_keys: coupon?.plan_keys ?? [], valid_until: coupon?.valid_until ?? "",
    max_redemptions: coupon?.max_redemptions != null ? String(coupon.max_redemptions) : "", is_active: coupon?.is_active ?? true,
  });
  const save = useMutation({
    mutationFn: async () => {
      const body = { ...f, payments: f.payments ? Number(f.payments) : null, max_redemptions: f.max_redemptions ? Number(f.max_redemptions) : null, valid_until: f.valid_until || null } as never;
      return coupon
        ? unwrap(await api.PATCH("/api/v1/platform/coupons/{id}/", { params: { path: { id: coupon.id } }, body }))
        : unwrap(await api.POST("/api/v1/platform/coupons/", { body }));
    },
    onSuccess: () => { toast.success("Coupon saved"); onClose(); },
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  return (
    <Modal open title={coupon ? `Edit ${coupon.code}` : "New coupon"} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Code"><Input required value={f.code} onChange={(e) => setF((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="LAUNCH50" /></Field>
          <Field label="Description"><Input value={f.description} onChange={set("description")} /></Field>
          <Field label="Percent off"><Input inputMode="decimal" value={f.percent_off} onChange={set("percent_off")} /></Field>
          <Field label="KES off (per period)"><Input inputMode="decimal" value={f.amount_off} onChange={set("amount_off")} /></Field>
          <Field label="For how many payments" hint="Blank: every payment"><Input inputMode="numeric" value={f.payments} onChange={set("payments")} /></Field>
          <Field label="Most uses" hint="Blank: no limit"><Input inputMode="numeric" value={f.max_redemptions} onChange={set("max_redemptions")} /></Field>
          <Field label="Valid until"><Input type="date" value={f.valid_until} onChange={set("valid_until")} /></Field>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="text-stone-600">Only for:</span>
          {["biashara", "duka", "kampuni"].map((k) => <label key={k} className="flex items-center gap-1.5"><input type="checkbox" checked={f.plan_keys.includes(k)} onChange={(e) => setF((p) => ({ ...p, plan_keys: e.target.checked ? [...p.plan_keys, k] : p.plan_keys.filter((x) => x !== k) }))} /> {k}</label>)}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={(e) => setF((p) => ({ ...p, is_active: e.target.checked }))} /> Active</label>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
      </form>
    </Modal>
  );
}
