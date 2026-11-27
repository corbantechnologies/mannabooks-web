"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { ask } from "@/components/confirm";
import { Button, Card, Field, FormError, Input, Modal, Select, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useSuppliers } from "@/lib/api/purchasing";
import { useCustomers } from "@/lib/api/sales";
import { fmt, todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

/**
 * A business that is both a customer and a supplier: link the two records, see what each side owes and the net, and set one
 * off against the other (no money moves). Shown on the customer's page and the supplier's.
 */
export function BothSides({ side, id }: { side: "customer" | "supplier"; id: string }) {
  const { slug, can } = useWorkspace();
  const qc = useQueryClient();
  const path = { params: { path: { workspace: slug, id } } };
  const key = ["both-sides", slug, side, id];
  const q = useQuery({
    queryKey: key,
    queryFn: async () => (side === "customer"
      ? unwrap(await api.GET("/api/v1/w/{workspace}/customers/{id}/both-sides/", path))
      : unwrap(await api.GET("/api/v1/w/{workspace}/suppliers/{id}/both-sides/", path))),
  });
  const customers = useCustomers(slug);
  const suppliers = useSuppliers(slug);
  const others = ((side === "customer" ? suppliers.data?.results : customers.data?.results) ?? []) as { id: string; name: string }[];
  const [linking, setLinking] = useState(false);
  const [other, setOther] = useState("");
  const [settingOff, setSettingOff] = useState(false);
  const [so, setSo] = useState({ setoff_date: todayIso(), amount: "", notes: "" });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["both-sides", slug] });
    void qc.invalidateQueries({ queryKey: ["customer-statement", slug] });
    void qc.invalidateQueries({ queryKey: ["supplier-statement", slug] });
  };
  const link = useMutation({
    mutationFn: async (body: { other_id?: string; create?: boolean; unlink?: boolean }) => (side === "customer"
      ? unwrap(await api.POST("/api/v1/w/{workspace}/customers/{id}/both-sides/", { ...path, body: body as never }))
      : unwrap(await api.POST("/api/v1/w/{workspace}/suppliers/{id}/both-sides/", { ...path, body: body as never }))),
    onSuccess: (_d, body) => { toast.success(body.unlink ? "Unlinked" : "Linked"); setLinking(false); refresh(); },
    onError: (e) => toast.error(e.message),
  });
  const setOff = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/customers/set-offs/", {
      ...wsPath(slug), body: { customer_id: q.data!.customer_id, ...so } as never,
    })),
    onSuccess: (r) => { toast.success(`${r.number}: ${fmt(r.amount)} set off`); setSettingOff(false); refresh(); },
  });
  const manage = can("customers.manage") && can("suppliers.manage");
  if (q.isLoading) return null;
  const d = q.data;
  const otherWord = side === "customer" ? "supplier" : "customer";
  if (!d) {
    if (!manage) return null;
    return (
      <>
        <p className="mb-4 text-sm text-stone-600">
          Do they also {side === "customer" ? "supply you" : "buy from you"}?{" "}
          <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => { link.reset(); setLinking(true); }}>Link their {otherWord} record</button>
          {" "}to see both sides together and set one off against the other.
        </p>
        <Modal open={linking} title={`Also a ${otherWord}`} onClose={() => setLinking(false)}>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); link.mutate(other === "__new__" ? { create: true } : { other_id: other }); }}>
            <Field label={`Their ${otherWord} record`}>
              <Select required value={other} onChange={(e) => setOther(e.target.value)}>
                <option value="">Choose</option>
                <option value="__new__">+ Make one from this {side} (same name, contacts and KRA PIN)</option>
                {others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </Select>
            </Field>
            <FormError error={link.error} />
            <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setLinking(false)}>Cancel</Button><Button type="submit" loading={link.isPending}>Link</Button></div>
          </form>
        </Modal>
      </>
    );
  }
  const net = Number(d.net);
  return (
    <Card className="mb-6 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Also a {otherWord}:{" "}
            <Link className="text-brand-700 hover:underline" href={side === "customer" ? `/w/${slug}/purchasing/suppliers/${d.supplier_id}` : `/w/${slug}/sales/customers/${d.customer_id}`}>
              {side === "customer" ? d.supplier_name : d.customer_name}
            </Link>
          </h2>
          <p className="mt-1 text-sm text-stone-700">
            They owe you {fmt(d.they_owe)} · you owe them {fmt(d.we_owe)} ·{" "}
            <span className="font-semibold">{net === 0 ? "even" : net > 0 ? `net ${fmt(net)} to you` : `net ${fmt(-net)} to them`}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Number(d.can_set_off) > 0 && can("payments.create") && can("supplierpayments.create") && (
            <Button variant="secondary" onClick={() => { setOff.reset(); setSo({ setoff_date: todayIso(), amount: String(d.can_set_off), notes: "" }); setSettingOff(true); }}>Set off</Button>
          )}
          {manage && <Button variant="ghost" onClick={() => void ask(`Unlink the ${otherWord} record? Both records stay.`).then((ok) => ok && link.mutate({ unlink: true }))}>Unlink</Button>}
        </div>
      </div>
      <Modal open={settingOff} title="Set off what each side owes" onClose={() => setSettingOff(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setOff.mutate(); }}>
          <p className="text-sm text-stone-600">
            Their oldest open invoices and your oldest open bills to them both go down by this amount. No money moves. Do it once you&apos;ve both agreed. At most {fmt(d.can_set_off)} now.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date"><Input type="date" required value={so.setoff_date} onChange={(e) => setSo((p) => ({ ...p, setoff_date: e.target.value }))} /></Field>
            <Field label="Amount"><Input required inputMode="decimal" value={so.amount} onChange={(e) => setSo((p) => ({ ...p, amount: e.target.value }))} /></Field>
          </div>
          <Field label="Notes" hint="e.g. who agreed and how"><Textarea rows={2} value={so.notes} onChange={(e) => setSo((p) => ({ ...p, notes: e.target.value }))} /></Field>
          <FormError error={setOff.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setSettingOff(false)}>Cancel</Button><Button type="submit" loading={setOff.isPending}>Set off</Button></div>
        </form>
      </Modal>
    </Card>
  );
}
