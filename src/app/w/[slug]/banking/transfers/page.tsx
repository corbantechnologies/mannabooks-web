"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, Field, FormError, Input, Modal, PageHeader, Select, Table, Td } from "@/components/ui";
import { useBankAccounts } from "@/lib/api/banking";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate, todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function TransfersPage() {
  const { slug, can } = useWorkspace();
  const accounts = useBankAccounts(slug);
  const active = (accounts.data?.results ?? []).filter((a) => a.is_active);
  const list = useQuery({ queryKey: ["bank-transfers", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/bank-transfers/", { params: { path: { workspace: slug }, query: { page_size: 100 } } })) });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ transfer_date: todayIso(), from_account_id: "", to_account_id: "", amount: "", fee: "0", reference: "" });
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/bank-transfers/", { ...wsPath(slug), body: form as never })),
    onSuccess: (t) => { toast.success(`${t.number} saved`); setOpen(false); },
  });
  const voidIt = useMutation({
    mutationFn: async (id: string) => unwrap(await api.POST("/api/v1/w/{workspace}/bank-transfers/{id}/void/", { params: { path: { workspace: slug, id } } })),
    onSuccess: () => toast.success("Transfer voided"), onError: (e) => toast.error(e.message),
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const rows = list.data?.results ?? [];
  return (
    <div className="w-full">
      <PageHeader title="Transfers" description="Money moved between your own accounts: banking the day's cash, M-Pesa to bank, topping up petty cash." guide="banking"
        actions={can("banking.transfer") && <Button onClick={() => { save.reset(); setOpen(true); }}><Plus className="h-4 w-4" /> New transfer</Button>} />
      <Card>
        {rows.length === 0 ? <EmptyState title="No transfers yet" /> : (
          <Table head={["Date", "Number", "From", "To", "Amount", "Charge", ""]}>
            {rows.map((t) => (
              <tr key={t.id}>
                <Td>{fmtDate(t.transfer_date)}</Td><Td className="font-mono text-xs">{t.number}</Td><Td>{t.from_account_name}</Td><Td>{t.to_account_name}</Td>
                <Td className="text-right font-mono">{fmt(t.amount)}</Td><Td className="text-right font-mono">{Number(t.fee) ? fmt(t.fee) : ""}</Td>
                <Td>{t.status === "void" ? <Badge>Void</Badge> : can("banking.transfer") && <Button variant="ghost" className="px-2 py-1 text-red-600" onClick={() => confirm("Void this transfer?") && voidIt.mutate(t.id)}>Void</Button>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={open} title="Move money" onClose={() => setOpen(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="From"><Select required value={form.from_account_id} onChange={set("from_account_id")}><option value="">Choose</option>{active.map((a) => <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance)})</option>)}</Select></Field>
            <Field label="To"><Select required value={form.to_account_id} onChange={set("to_account_id")}><option value="">Choose</option>{active.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
            <Field label="Amount"><Input required inputMode="decimal" value={form.amount} onChange={set("amount")} /></Field>
            <Field label="Charge" hint="Bank or M-Pesa fee, if any."><Input inputMode="decimal" value={form.fee} onChange={set("fee")} /></Field>
            <Field label="Date"><Input type="date" value={form.transfer_date} onChange={set("transfer_date")} /></Field>
            <Field label="Reference"><Input value={form.reference} onChange={set("reference")} /></Field>
          </div>
          <FormError error={save.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
        </form>
      </Modal>
    </div>
  );
}
